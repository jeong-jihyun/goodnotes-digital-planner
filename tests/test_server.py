"""API 서버 테스트 (server/app.py). 실행: python -m pytest -q tests/test_server.py
한글 글꼴은 PLANNER_FONT 환경변수 경로를 쓴다. 없으면 한글 생성 시험은 건너뛴다."""
import os, sys, time, importlib, tempfile, pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "server"))

from fastapi.testclient import TestClient  # noqa: E402

FONT = os.environ.get("PLANNER_FONT", "/usr/share/fonts/truetype/nanum/NanumGothic.ttf")
HAS_FONT = os.path.exists(FONT)

GOOD = {"year": 2027, "weekStart": "monday", "lang": "en", "theme": "navy", "paper": "tablet-landscape",
        "linkScope": "full", "weekly": False, "daily": False, "notes": 1}


def load(**env):
    for k, v in env.items():
        os.environ[k] = str(v)
    import app as srv
    srv = importlib.reload(srv)
    return srv, TestClient(srv.app)


@pytest.fixture
def api():
    srv, c = load(PLANNER_FONT=FONT, KEEP_SECONDS=3600, MAX_PER_IP_PER_10MIN=20,
                  WORK_DIR=tempfile.mkdtemp())
    return srv, c


def wait(c, jid, timeout=60):
    t0 = time.time()
    while time.time() - t0 < timeout:
        r = c.get(f"/api/v1/generations/{jid}").json()
        if r["status"] in ("succeeded", "failed", "expired"):
            return r
        time.sleep(0.2)
    raise AssertionError("시간 초과")


def test_health_and_options(api):
    _, c = api
    h = c.get("/health").json()
    assert h["status"] == "ok" and h["fontReady"] == HAS_FONT
    o = c.get("/api/v1/planner/options").json()
    assert o["constraints"]["notes"] == {"min": 1, "max": 50}
    assert "ko-en" in o["constraints"]["lang"] and "a4-portrait" in o["constraints"]["paper"]


@pytest.mark.parametrize("bad,field", [
    ({"year": 1999}, "year"), ({"year": 2101}, "year"), ({"year": "2027"}, "year"), ({"year": 2027.5}, "year"),
    ({"notes": 0}, "notes"), ({"notes": 51}, "notes"), ({"lang": "jp"}, "lang"), ({"theme": "red"}, "theme"),
    ({"paper": "letter"}, "paper"), ({"linkScope": "none"}, "linkScope"), ({"weekly": "yes"}, "weekly"),
    ({"outputPath": "/etc"}, "outputPath"),            # 모르는 칸은 거부 (경로 주입 방지)
    ({"startMonth": 0}, "startMonth"), ({"startMonth": 13}, "startMonth"),
    ({"months": 0}, "months"), ({"months": 19}, "months"), ({"holidays": "yes"}, "holidays"),
])
def test_validation_rejects(api, bad, field):
    _, c = api
    r = c.post("/api/v1/planner/validate", json={**GOOD, **bad})
    assert r.status_code == 422
    body = r.json()
    assert body["code"] == "VALIDATION_ERROR" and body["errors"][0]["field"] == field
    # 생성 요청도 엔진 실행 전에 막힌다
    assert c.post("/api/v1/generations", json={**GOOD, **bad}).status_code == 422


def test_validate_ok_and_boundaries(api):
    _, c = api
    for extra in ({}, {"year": 2000}, {"year": 2100}, {"notes": 50}):
        assert c.post("/api/v1/planner/validate", json={**GOOD, **extra}).json() == {"valid": True, "errors": []}


def test_generate_status_download_en(api):
    _, c = api
    r = c.post("/api/v1/generations", json=GOOD)
    assert r.status_code == 202
    jid = r.json()["generationId"]
    done = wait(c, jid)
    assert done["status"] == "succeeded", done
    res = done["result"]
    assert res["validationPassed"] and res["brokenLinkCount"] == 0
    assert res["pageCount"] == res["expectedPages"] == 15
    assert res["fileName"] == "planner_2027_en_navy.pdf"
    assert done["progress"] is None                       # 진행률은 지어내지 않는다
    assert "dir" not in done and "/tmp" not in str(done)   # 서버 경로 비노출
    d = c.get(res["downloadUrl"])
    assert d.status_code == 200 and d.headers["content-type"] == "application/pdf"
    assert "attachment" in d.headers["content-disposition"] and d.content[:4] == b"%PDF"


@pytest.mark.skipif(not HAS_FONT, reason="한글 글꼴 없음")
def test_generate_korean_portrait(api):
    _, c = api
    body = {**GOOD, "lang": "ko-en", "paper": "goodnotes-portrait", "weekly": True}
    done = wait(c, c.post("/api/v1/generations", json=body).json()["generationId"])
    assert done["status"] == "succeeded", done
    assert done["result"]["fileName"].endswith("_goodnotes-portrait.pdf")


def test_korean_without_font_is_not_success():
    _, c = load(PLANNER_FONT="/no/such/font.ttf", WORK_DIR=tempfile.mkdtemp(), MAX_PER_IP_PER_10MIN=20)
    done = wait(c, c.post("/api/v1/generations", json={**GOOD, "lang": "ko"}).json()["generationId"])
    assert done["status"] == "failed" and "글꼴" in done["error"]["message"]
    assert c.get(f"/api/v1/generations/{done['generationId']}/download").status_code == 409


def test_unknown_job_and_not_ready(api):
    _, c = api
    assert c.get("/api/v1/generations/nope").status_code == 404
    assert c.get("/api/v1/generations/nope/download").status_code == 404


def test_expired_file_410():
    srv, c = load(PLANNER_FONT=FONT, KEEP_SECONDS=0, WORK_DIR=tempfile.mkdtemp(), MAX_PER_IP_PER_10MIN=20)
    jid = c.post("/api/v1/generations", json=GOOD).json()["generationId"]
    t0 = time.time()
    while srv.JOBS[jid]["status"] not in ("succeeded", "failed") and time.time() - t0 < 60:
        time.sleep(0.2)
    time.sleep(0.05)
    r = c.get(f"/api/v1/generations/{jid}/download")
    assert r.status_code == 410 and r.json()["code"] == "FILE_EXPIRED"
    assert not os.path.exists(srv.JOBS[jid]["dir"])      # 파일도 지워짐


def test_rate_limit():
    _, c = load(PLANNER_FONT=FONT, MAX_PER_IP_PER_10MIN=2, WORK_DIR=tempfile.mkdtemp(), KEEP_SECONDS=3600)
    codes = [c.post("/api/v1/generations", json=GOOD).status_code for _ in range(3)]
    assert codes == [202, 202, 429]


def test_cors_allows_site_only(api):
    _, c = api
    ok = c.options("/api/v1/generations", headers={"Origin": "https://goodnotes-digital-planner.vercel.app",
                                                   "Access-Control-Request-Method": "POST"})
    assert ok.headers.get("access-control-allow-origin") == "https://goodnotes-digital-planner.vercel.app"
    bad = c.options("/api/v1/generations", headers={"Origin": "https://evil.example.com",
                                                    "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in bad.headers


@pytest.mark.skipif(not HAS_FONT, reason="한글 글꼴 없음")
def test_generate_period_with_holidays(api):
    _, c = api
    body = {**GOOD, "lang": "ko", "startMonth": 11, "months": 3, "holidays": True, "weekly": True}
    done = wait(c, c.post("/api/v1/generations", json=body).json()["generationId"])
    assert done["status"] == "succeeded", done
    r = done["result"]
    assert r["fileName"] == "planner_2027_ko_navy_11m3.pdf"
    assert r["pageCount"] == r["expectedPages"] and r["brokenLinkCount"] == 0
