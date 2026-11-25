"""3단계 엔진 기능: 용지 3종 · 링크 범위(full/monthly) · 한국어+영어 병기."""
import os, json, tempfile, pytest
from datetime import date, timedelta
from pypdf import PdfReader
from engine.config import PlannerConfig, PAPERS
from engine.calendar_utils import weeks_of_year, month_key, week_key
from engine.planner import generate
from engine.validate import validate_pdf, link_targets
from engine.labels import LABELS
from engine.copy_text import make_copy


def _build(tmp, **kw):
    out = os.path.join(tmp, "p.pdf")
    info = generate(PlannerConfig(**kw), out)
    return out, info


# ---- 용지 3종 ----
@pytest.mark.parametrize("paper", list(PAPERS))
def test_paper_size_and_all_links_match_design(paper):
    with tempfile.TemporaryDirectory() as d:
        out, info = _build(d, year=2027, paper=paper, include_daily=True, note_pages=2)
        r = validate_pdf(out)
        assert r["ok"], r["broken"][:5]
        w, h = PAPERS[paper]
        for p in PdfReader(out).pages[:3]:
            box = p.mediabox
            assert (round(float(box.width)), round(float(box.height))) == (w, h)
        expected = sorted((s, info["dest_page"][k]) for s, k in info["link_list"])
        assert sorted(link_targets(out)) == expected


def test_portrait_pages_are_taller_than_wide():
    for paper in ("goodnotes-portrait", "a4-portrait"):
        w, h = PAPERS[paper]
        assert h > w
    w, h = PAPERS["tablet-landscape"]
    assert (w, h) == (842, 595)   # 기존 상품과 같은 기본 규격 유지


# ---- 링크 범위 ----
def test_monthly_scope_has_no_day_or_week_links():
    with tempfile.TemporaryDirectory() as d:
        out, info = _build(d, year=2027, link_scope="monthly", note_pages=1)
        dests = {k for _, k in info["link_list"]}
        assert not any(k.startswith(("day_", "week_")) for k in dests)
        # 오른쪽 탭(연간·12개월·노트)은 그대로
        assert {"year", "notes_1"} | {month_key(2027, m) for m in range(1, 13)} <= dests
        assert validate_pdf(out)["ok"]


def test_full_scope_every_week_page_is_reachable_from_a_month():
    with tempfile.TemporaryDirectory() as d:
        out, info = _build(d, year=2027, week_start="sunday", include_daily=False, note_pages=1)
        month_pages = {info["dest_page"][month_key(2027, m)] for m in range(1, 13)}
        from_month = {k for p, k in info["link_list"] if p in month_pages}
        for s in weeks_of_year(2027, "sunday"):
            assert week_key(s) in from_month, s


def test_full_scope_week_and_day_pages_link_back_to_their_month():
    with tempfile.TemporaryDirectory() as d:
        out, info = _build(d, year=2027, week_start="monday", note_pages=1)
        by_page = {}
        for p, k in info["link_list"]:
            by_page.setdefault(p, set()).add(k)
        # 2027-03-15 일간 → 3월
        assert month_key(2027, 3) in by_page[info["dest_page"]["day_2027-03-15"]]
        weeks = weeks_of_year(2027, "monday")
        # 첫 주(2026-12-28 시작, 가운데 날 2026-12-31) → 1월, 마지막 주 → 12월
        assert weeks[0] == date(2026, 12, 28)
        first_links = by_page[info["dest_page"][week_key(weeks[0])]] - {"year", "notes_1"}
        assert month_key(2027, 1) in first_links
        last = weeks[-1]   # 2027-12-27 시작 → 12월
        assert last == date(2027, 12, 27)
        assert month_key(2027, 12) in by_page[info["dest_page"][week_key(last)]]


def test_weekly_off_means_no_week_links_even_in_full_scope():
    with tempfile.TemporaryDirectory() as d:
        out, info = _build(d, year=2027, include_weekly=False, note_pages=1)
        assert not any(k.startswith("week_") for _, k in info["link_list"])
        assert validate_pdf(out)["ok"]


# ---- 한국어 + 영어 ----
def test_bilingual_labels():
    L = LABELS["ko-en"]
    assert L["months"][0] == "1월 January"
    assert L["dow_mon"][0] == "월 Mon"
    assert L["months_tab"][0] == "1월\nJan"          # 좁은 탭은 두 줄
    assert L["months_short"][0] == "1월"             # 작은 연간 달력은 한글만
    for k in ("ko", "en", "ko-en"):
        assert len(LABELS[k]["months"]) == 12 and len(LABELS[k]["dow_sun"]) == 7


def test_bilingual_pdf_builds_with_valid_links():
    with tempfile.TemporaryDirectory() as d:
        out, info = _build(d, year=2028, lang="ko-en", paper="a4-portrait", note_pages=1)
        r = validate_pdf(out)
        assert r["ok"] and r["pages"] == info["pages"]
        assert "Digital Planner" in PdfReader(out).metadata.title


# ---- 설정 검증 ----
def test_new_option_validation():
    for bad in (dict(paper="letter"), dict(link_scope="none"), dict(lang="ko+en")):
        with pytest.raises(ValueError):
            PlannerConfig(**bad).validate()
    PlannerConfig(lang="ko-en", paper="goodnotes-portrait", link_scope="monthly").validate()


# ---- CLI · 상품 문구 ----
def test_cli_new_options_and_file_name():
    from engine.cli import main
    with tempfile.TemporaryDirectory() as d:
        code = main(["--year", "2027", "--lang", "ko-en", "--paper", "a4-portrait", "--links", "monthly",
                     "--no-daily", "--notes", "1", "--out", d])
        assert code == 0
        assert os.path.exists(os.path.join(d, "planner_2027_ko-en_navy_a4-portrait.pdf"))
        copy = json.load(open(os.path.join(d, "listing_copy.json"), encoding="utf-8"))
        assert "A4" in copy["description"] and "병기" in copy["description"]


def test_cli_default_file_name_unchanged():
    from engine.cli import main
    with tempfile.TemporaryDirectory() as d:
        assert main(["--year", "2027", "--no-daily", "--no-weekly", "--notes", "1", "--out", d]) == 0
        assert os.path.exists(os.path.join(d, "planner_2027_ko_navy.pdf"))


def test_copy_text_for_portrait_english():
    t = make_copy(PlannerConfig(year=2027, lang="en", paper="goodnotes-portrait"), {"pages": 1, "links": 1})
    assert "GoodNotes portrait" in t["description"]
