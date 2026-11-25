"""6단계: 기간 고르기(시작 달·1~18개월) + 한국 공휴일 표시."""
import os, tempfile, pytest
from datetime import date
from pypdf import PdfReader
from engine.config import PlannerConfig
from engine.calendar_utils import period_months, period_range, weeks_between, month_key, week_key
from engine.planner import generate
from engine.validate import validate_pdf, link_targets
from engine.holidays_kr import kr_holidays
from engine.copy_text import make_copy

FONT = os.environ.get("PLANNER_FONT", "/usr/share/fonts/truetype/nanum/NanumGothic.ttf")
HAS_FONT = os.path.exists(FONT)


def build(tmp, **kw):
    out = os.path.join(tmp, "p.pdf")
    info = generate(PlannerConfig(font_path=FONT if HAS_FONT else "", **kw), out)
    return out, info


def test_period_months_crosses_year():
    assert period_months(2027, 11, 3) == [(2027, 11), (2027, 12), (2028, 1)]
    assert len(period_months(2026, 7, 18)) == 18 and period_months(2026, 7, 18)[-1] == (2027, 12)
    assert period_range(2027, 11, 3) == (date(2027, 11, 1), date(2028, 1, 31))
    assert period_range(2028, 2, 1) == (date(2028, 2, 1), date(2028, 2, 29))   # 윤년 2월


@pytest.mark.parametrize("paper", ["tablet-landscape", "goodnotes-portrait", "a4-portrait"])
def test_cross_year_period_pages_and_links(paper):
    with tempfile.TemporaryDirectory() as d:
        out, info = build(d, year=2027, start_month=11, months=3, paper=paper, note_pages=1)
        weeks = weeks_between(date(2027, 11, 1), date(2028, 1, 31), "monday")
        assert info["pages"] == 2 + 3 + len(weeks) + 92 + 1          # 11·12·1월 = 30+31+31일
        assert {month_key(2027, 11), month_key(2027, 12), month_key(2028, 1)} <= info["dests"]
        assert month_key(2027, 10) not in info["dests"]
        r = validate_pdf(out)
        assert r["ok"] and r["pages"] == info["pages"]
        assert sorted(link_targets(out)) == sorted((s, info["dest_page"][k]) for s, k in info["link_list"])


def test_18_month_landscape_and_tabs():
    with tempfile.TemporaryDirectory() as d:
        out, info = build(d, year=2026, start_month=7, months=18, include_daily=False, note_pages=1)
        dests = {k for _, k in info["link_list"]}
        assert {month_key(y, m) for y, m in period_months(2026, 7, 18)} <= dests   # 탭 18개 모두 연결
        assert validate_pdf(out)["ok"]


def test_week_pages_at_period_edges_link_back_inside_period():
    with tempfile.TemporaryDirectory() as d:
        out, info = build(d, year=2027, start_month=3, months=2, include_daily=False, note_pages=1)
        weeks = weeks_between(date(2027, 3, 1), date(2027, 4, 30), "monday")
        by_page = {}
        for p, k in info["link_list"]:
            by_page.setdefault(p, set()).add(k)
        first = by_page[info["dest_page"][week_key(weeks[0])]]
        last = by_page[info["dest_page"][week_key(weeks[-1])]]
        assert month_key(2027, 3) in first and month_key(2027, 4) in last
        # 기간 밖 달(2월·5월)로 가는 링크는 없다
        all_dests = {k for _, k in info["link_list"]}
        assert month_key(2027, 2) not in all_dests and month_key(2027, 5) not in all_dests


def test_default_period_is_unchanged():
    with tempfile.TemporaryDirectory() as d:
        out, info = build(d, year=2027, note_pages=5)
        assert info["pages"] == 437
        assert PdfReader(out).metadata.title.startswith("2027 ")


def test_korean_holidays_data():
    h = kr_holidays((2027,), "ko")
    assert h[date(2027, 2, 7)] == "설날" and "대체" in h[date(2027, 2, 9)]
    assert h[date(2027, 9, 15)] == "추석"
    assert "·" in kr_holidays((2028,), "ko")[date(2028, 10, 3)]          # 개천절·추석 겹침
    assert "New Year" in kr_holidays((2027,), "en")[date(2027, 2, 7)]


@pytest.mark.skipif(not HAS_FONT, reason="한글 글꼴 없음")
def test_holiday_names_appear_only_when_on():
    with tempfile.TemporaryDirectory() as d:
        on, info = build(d, year=2027, start_month=2, months=1, holidays=True, note_pages=1)
        # 2쪽=연간, 3쪽=2월 월간
        text = PdfReader(on).pages[2].extract_text()
        assert "설날" in text
        day = PdfReader(on).pages[info["dest_page"]["day_2027-02-07"] - 1].extract_text()
        assert "설날" in day
    with tempfile.TemporaryDirectory() as d:
        off, _ = build(d, year=2027, start_month=2, months=1, holidays=False, note_pages=1)
        assert "설날" not in PdfReader(off).pages[2].extract_text()


def test_validation_of_period():
    for bad in (dict(start_month=0), dict(start_month=13), dict(months=0), dict(months=19)):
        with pytest.raises(ValueError):
            PlannerConfig(**bad).validate()


def test_copy_text_mentions_period_and_holidays():
    cfg = PlannerConfig(year=2027, start_month=3, months=12, holidays=True)
    t = make_copy(cfg, {"pages": 1, "links": 1})
    assert "2027.03 - 2028.02" in t["description"] and "공휴일" in t["description"]
    t2 = make_copy(PlannerConfig(year=2027), {"pages": 1, "links": 1})
    assert "2027년 한 해" in t2["description"]


def test_cli_period_file_name():
    from engine.cli import main
    with tempfile.TemporaryDirectory() as d:
        assert main(["--year", "2027", "--start-month", "3", "--months", "6", "--holidays",
                     "--no-daily", "--notes", "1", "--out", d]) == 0
        assert os.path.exists(os.path.join(d, "planner_2027_ko_navy_03m6.pdf"))
