"""8단계: 추가 페이지(목표·습관·독서·가계부) + 일간·노트 속지 모양."""
import os, tempfile, pytest
from pypdf import PdfReader
from engine.config import PlannerConfig, EXTRAS, DAILY_LAYOUTS, NOTE_STYLES
from engine.planner import generate
from engine.validate import validate_pdf, link_targets
from engine.copy_text import make_copy

FONT = os.environ.get("PLANNER_FONT", "/usr/share/fonts/truetype/nanum/NanumGothic.ttf")
HAS_FONT = os.path.exists(FONT)


def build(tmp, **kw):
    out = os.path.join(tmp, "p.pdf")
    info = generate(PlannerConfig(font_path=FONT if HAS_FONT else "", **kw), out)
    return out, info


def by_page(info):
    out = {}
    for p, k in info["link_list"]:
        out.setdefault(p, set()).add(k)
    return out


def test_all_extras_page_count_and_links():
    with tempfile.TemporaryDirectory() as d:
        base_out, base = build(d, year=2027, include_daily=False, include_weekly=False, note_pages=1)
    with tempfile.TemporaryDirectory() as d:
        out, info = build(d, year=2027, include_daily=False, include_weekly=False, note_pages=1, extras=EXTRAS)
        # 연간 목표 1 + 독서 2 + (월 목표·습관·가계부) × 12
        assert info["pages"] == base["pages"] + 1 + 2 + 3 * 12
        r = validate_pdf(out)
        assert r["ok"], r["broken"][:3]
        assert sorted(link_targets(out)) == sorted((s, info["dest_page"][k]) for s, k in info["link_list"])


def test_month_extras_come_right_after_their_month():
    with tempfile.TemporaryDirectory() as d:
        _, info = build(d, year=2027, include_daily=False, include_weekly=False, note_pages=1, extras=EXTRAS)
        dp = info["dest_page"]
        assert dp["year_goals"] == 3 and dp["reading_1"] == 4 and dp["reading_2"] == 5
        m = dp["month_2027_03"]
        assert (dp["goals_2027_03"], dp["habits_2027_03"], dp["budget_2027_03"]) == (m + 1, m + 2, m + 3)


def test_header_shortcuts_link_to_extras():
    with tempfile.TemporaryDirectory() as d:
        _, info = build(d, year=2027, include_daily=False, include_weekly=False, note_pages=1, extras=EXTRAS)
        bp, dp = by_page(info), info["dest_page"]
        assert {"year_goals", "reading_1"} <= bp[dp["year"]]                       # 연간 → 목표·독서
        assert {"goals_2027_05", "habits_2027_05", "budget_2027_05"} <= bp[dp["month_2027_05"]]  # 월 → 그 달 것
        assert "month_2027_05" in bp[dp["habits_2027_05"]]                         # 습관 → 그 달로 돌아가기


def test_only_selected_extras_and_no_shortcuts_without_them():
    with tempfile.TemporaryDirectory() as d:
        _, info = build(d, year=2027, include_daily=False, include_weekly=False, note_pages=1, extras=("habits",))
        assert "habits_2027_01" in info["dests"]
        assert not any(k.startswith(("goals_", "budget_", "reading_", "year_goals")) for k in info["dests"])
    with tempfile.TemporaryDirectory() as d:
        _, info = build(d, year=2027, include_daily=False, include_weekly=False, note_pages=1)
        assert not any(k.startswith(("habits_", "goals_", "budget_", "reading_")) for _, k in info["link_list"])


def test_extras_across_year_boundary():
    with tempfile.TemporaryDirectory() as d:
        out, info = build(d, year=2027, start_month=12, months=2, include_daily=False, note_pages=1, extras=EXTRAS)
        assert {"habits_2027_12", "habits_2028_01", "budget_2028_01"} <= info["dests"]
        assert validate_pdf(out)["ok"]


@pytest.mark.skipif(not HAS_FONT, reason="한글 글꼴 없음")
def test_habit_tracker_uses_month_length():
    with tempfile.TemporaryDirectory() as d:
        out, info = build(d, year=2028, start_month=2, months=1, include_daily=False, include_weekly=False,
                          note_pages=1, extras=("habits",))
        text = PdfReader(out).pages[info["dest_page"]["habits_2028_02"] - 1].extract_text()
        assert "29" in text and "30" not in text.split("습관 트래커")[-1]     # 윤년 2월: 29일까지


@pytest.mark.parametrize("layout", DAILY_LAYOUTS)
@pytest.mark.parametrize("paper", ["tablet-landscape", "goodnotes-portrait"])
def test_daily_layouts_build(layout, paper):
    with tempfile.TemporaryDirectory() as d:
        out, info = build(d, year=2027, start_month=1, months=1, daily_layout=layout, paper=paper, note_pages=1)
        assert validate_pdf(out)["ok"] and "day_2027-01-31" in info["dests"]


@pytest.mark.parametrize("style", NOTE_STYLES)
def test_note_styles_build(style):
    with tempfile.TemporaryDirectory() as d:
        out, _ = build(d, year=2027, months=1, include_daily=False, include_weekly=False, note_style=style, note_pages=2)
        assert validate_pdf(out)["ok"]


def test_option_validation():
    assert PlannerConfig(extras=["budget", "goals", "goals"]).validate().extras == ("goals", "budget")
    for bad in (dict(extras=("diary",)), dict(daily_layout="hourly"), dict(note_style="music")):
        with pytest.raises(ValueError):
            PlannerConfig(**bad).validate()


def test_copy_text_and_cli():
    t = make_copy(PlannerConfig(year=2027, extras=("habits", "budget")), {"pages": 1, "links": 1})
    assert "습관 트래커" in t["description"] and "가계부" in t["description"]
    from engine.cli import main
    with tempfile.TemporaryDirectory() as d:
        assert main(["--year", "2027", "--extras", "goals,reading", "--daily-layout", "timetable",
                     "--note-style", "dot", "--months", "1", "--notes", "1", "--out", d]) == 0
