"""9단계: 꾸미기 — 새 테마, 메인색 직접 고르기, 표지 문구, 글꼴."""
import os, sys, tempfile, importlib, time
import pytest
from pypdf import PdfReader

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))
from engine.config import PlannerConfig, THEMES, FONTS, theme_colors, contrast, custom_theme  # noqa: E402
from engine.planner import generate, font_file  # noqa: E402
from engine.validate import validate_pdf  # noqa: E402

FONT = os.environ.get("PLANNER_FONT", "/usr/share/fonts/truetype/nanum/NanumGothic.ttf")
HAS_FONT = os.path.exists(FONT)
FONT_DIR = os.path.dirname(FONT)


def small(**kw):
    base = dict(year=2027, months=1, note_pages=1, include_weekly=False, include_daily=False,
                lang="en", font_path=FONT if HAS_FONT else "")
    base.update(kw)
    return PlannerConfig(**base).validate()


# ---------- 색 ----------
@pytest.mark.parametrize("theme", ["pastel", "dark", "vintage", "terracotta"])
def test_new_themes_exist_and_readable(theme):
    assert theme in THEMES
    c = theme_colors(small(theme=theme))
    assert contrast(c["text"], c["bg"]) >= 4.5       # 본문 글자
    assert contrast(c["ink"], c["bg"]) >= 3.0        # 날짜·선
    assert contrast(c["on_main"], c["main"]) >= 3.0  # 머리띠 위 글자


@pytest.mark.parametrize("color", ["#FFD54F", "#FFFFFF", "#000000", "#00FF00", "#6558D3", "#1F3864"])
def test_custom_color_always_readable(color):
    c = theme_colors(small(theme="custom", custom_color=color))
    assert c["main"] == color.upper()
    assert contrast(c["ink"], c["bg"]) >= 3.0
    assert contrast(c["on_main"], c["main"]) >= 3.0
    assert contrast(c["text"], c["bg"]) >= 4.5 or color == "#FFFFFF"


def test_custom_sub_is_light():
    sub = custom_theme("#BF603D")["sub"]
    assert contrast(sub, "#FFFFFF") < 1.4    # 거의 흰색에 가까운 연한 색


@pytest.mark.parametrize("bad", ["", "red", "#12345", "#GGGGGG", "123456"])
def test_custom_color_rejected(bad):
    with pytest.raises(ValueError):
        small(theme="custom", custom_color=bad)


def test_unknown_theme_and_font_and_long_text_rejected():
    with pytest.raises(ValueError):
        small(theme="neon")
    with pytest.raises(ValueError):
        small(font_family="comic")
    with pytest.raises(ValueError):
        small(owner="가" * 31)
    with pytest.raises(ValueError):
        small(motto="가" * 61)


# ---------- 글꼴·표지 ----------
@pytest.mark.skipif(not HAS_FONT, reason="한글 글꼴 없음")
@pytest.mark.parametrize("family", list(FONTS))
def test_each_font_embeds(family, tmp_path):
    if not os.path.exists(os.path.join(FONT_DIR, FONTS[family])):
        pytest.skip(f"{FONTS[family]} 없음")
    cfg = small(lang="ko", font_family=family, theme="dark", title="나의 플래너", owner="정지현", motto="매일 조금씩")
    assert font_file(cfg).endswith(FONTS[family])
    out = tmp_path / "p.pdf"
    generate(cfg, str(out))
    check = validate_pdf(str(out))
    assert check["ok"] and not check["broken"]
    fonts = set()
    for page in PdfReader(str(out)).pages[:1]:
        for f in page["/Resources"]["/Font"].values():
            fonts.add(str(f.get_object()["/BaseFont"]))
    stem = FONTS[family].replace(".ttf", "")
    assert any(stem in name for name in fonts), fonts
    text = PdfReader(str(out)).pages[0].extract_text()
    for word in ("나의 플래너", "정지현", "매일 조금씩"):
        assert word in text.replace("\n", " ") or word.replace(" ", "") in text.replace("\n", "").replace(" ", "")


@pytest.mark.skipif(not HAS_FONT, reason="한글 글꼴 없음")
def test_dark_theme_full_year_links(tmp_path):
    cfg = PlannerConfig(year=2027, lang="ko", theme="dark", font_path=FONT, note_pages=2,
                        extras=("goals", "habits", "reading", "budget"))
    out = tmp_path / "d.pdf"
    generate(cfg, str(out))
    check = validate_pdf(str(out))
    assert check["ok"] and not check["broken"]


# ---------- 서버 ----------
GOOD = {"year": 2027, "weekStart": "monday", "lang": "en", "theme": "navy", "paper": "tablet-landscape",
        "linkScope": "full", "weekly": False, "daily": False, "notes": 1, "months": 1}


@pytest.fixture
def api():
    for k, v in dict(PLANNER_FONT=FONT, KEEP_SECONDS=3600, MAX_PER_IP_PER_10MIN=50,
                     WORK_DIR=tempfile.mkdtemp()).items():
        os.environ[k] = str(v)
    from fastapi.testclient import TestClient
    import app as srv
    srv = importlib.reload(srv)
    return srv, TestClient(srv.app)


@pytest.mark.parametrize("bad,field", [
    ({"theme": "custom"}, "customColor"),
    ({"theme": "custom", "customColor": "blue"}, "customColor"),
    ({"fontFamily": "comic"}, "fontFamily"),
    ({"owner": "a" * 31}, "owner"),
    ({"motto": "a" * 61}, "motto"),
    ({"theme": "neon"}, "theme"),
])
def test_server_rejects(api, bad, field):
    _, c = api
    r = c.post("/api/v1/planner/validate", json={**GOOD, **bad})
    assert r.status_code == 422
    assert field in [e["field"] for e in r.json()["errors"]]


def test_server_options_and_health_list_fonts(api):
    _, c = api
    o = c.get("/api/v1/planner/options").json()
    assert "custom" in o["constraints"]["theme"] and "dark" in o["constraints"]["theme"]
    h = c.get("/health").json()
    assert isinstance(h["fonts"], list)
    if HAS_FONT:
        assert "gothic" in h["fonts"]


@pytest.mark.skipif(not HAS_FONT, reason="한글 글꼴 없음")
def test_server_generates_custom_with_cover(api):
    _, c = api
    body = {**GOOD, "lang": "ko", "theme": "custom", "customColor": "#FFD54F",
            "title": "나의 2027", "owner": "정지현", "motto": "오늘도 화이팅"}
    r = c.post("/api/v1/generations", json=body)
    assert r.status_code == 202, r.text
    jid = r.json()["generationId"]
    t0 = time.time()
    while time.time() - t0 < 60:
        s = c.get(f"/api/v1/generations/{jid}").json()
        if s["status"] in ("succeeded", "failed"):
            break
        time.sleep(0.2)
    assert s["status"] == "succeeded", s


def test_server_missing_font_file_is_clear_error(api, monkeypatch):
    srv, c = api
    monkeypatch.setattr(srv, "fonts_available", lambda: ["gothic"])
    r = c.post("/api/v1/previews", json={**GOOD, "fontFamily": "pen"})
    assert r.status_code == 503
    assert "글꼴" in r.json()["message"]


# ---------- 10단계: 상품 문구 ----------
from engine.copy_text import make_copy, make_copy_both  # noqa: E402


def test_copy_both_languages_and_design_line():
    cfg = PlannerConfig(year=2027, lang="en", theme="dark", font_family="pen")
    both = make_copy_both(cfg, {"pages": 100, "links": 50})
    assert set(both) == {"ko", "en"}
    assert "다크 테마" in both["ko"]["description"] and "나눔손글씨 펜" in both["ko"]["description"]
    assert "플래너 글자: 영어" in both["ko"]["description"]
    assert "dark mode theme" in both["en"]["description"] and "handwritten" in both["en"]["description"]
    assert "100" in both["en"]["description"]
    # 예전처럼 lang 을 안 주면 플래너 언어를 따른다
    assert make_copy(cfg, {"pages": 1, "links": 1})["title"] == both["en"]["title"]


def test_copy_en_fits_etsy_limits():
    for lang in ("ko", "en", "ko-en"):
        cfg = PlannerConfig(year=2027, lang=lang, start_month=3, months=18)
        en = make_copy(cfg, {"pages": 900, "links": 900}, "en")
        assert len(en["title"]) <= 140
        assert len(en["tags"]) <= 13 and all(len(t) <= 20 for t in en["tags"])


@pytest.mark.skipif(not HAS_FONT, reason="한글 글꼴 없음")
def test_server_result_has_copy(api):
    _, c = api
    jid = c.post("/api/v1/generations", json={**GOOD, "theme": "vintage"}).json()["generationId"]
    t0 = time.time()
    while time.time() - t0 < 60:
        s = c.get(f"/api/v1/generations/{jid}").json()
        if s["status"] in ("succeeded", "failed"):
            break
        time.sleep(0.2)
    copy = s["result"]["copy"]
    assert copy["ko"]["title"] and copy["en"]["tags"]
    assert str(s["result"]["pageCount"]) in copy["en"]["description"]


def test_copy_title_matches_pages():
    off = make_copy(PlannerConfig(year=2027, include_weekly=False, include_daily=False), {"pages": 1, "links": 1}, "en")
    assert "Weekly" not in off["title"] and "Daily" not in off["title"]
    on = make_copy(PlannerConfig(year=2027), {"pages": 1, "links": 1}, "en")
    assert "Weekly Daily" in on["title"]
    ko = make_copy(PlannerConfig(year=2027, include_daily=False), {"pages": 1, "links": 1}, "ko")
    assert "주간" in ko["title"] and "일간" not in ko["title"]
