"""플래너 PDF 생성 API (Render 무료 웹 서비스에서 실행).

흐름: 화면(Vercel) → POST /api/v1/generations → 뒤에서 엔진 실행 → GET 상태 조회 → GET 다운로드
설계 기준: docs/PRJ-0001_API-설계서_v1.0.docx

지키는 것
- 입력은 허용된 칸·값만 받는다(모르는 칸이 오면 거부). 노트는 1~50.
- 서버 파일 경로·오류 상세(traceback)는 응답에 넣지 않는다.
- 작업마다 따로 임시 폴더를 쓰고, 보관 시간이 지나면 지운다.
- 링크 검증을 통과한 PDF만 내려받을 수 있다.
- 한글이 들어가는 설정인데 한글 글꼴이 없으면 '완료'로 처리하지 않는다.
"""
import base64, io, json, os, sys, shutil, tempfile, threading, time, uuid
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ConfigDict, Field

# 저장소 안에서 실행할 때도, Space 안에서 실행할 때도 engine 을 찾을 수 있게
ROOT = os.path.dirname(os.path.abspath(__file__))
for p in (ROOT, os.path.dirname(ROOT)):
    if os.path.isdir(os.path.join(p, "engine")) and p not in sys.path:
        sys.path.insert(0, p)

from engine.config import PlannerConfig, THEMES, PAPERS  # noqa: E402
from engine.planner import generate  # noqa: E402
from engine.validate import validate_pdf  # noqa: E402

FONT_PATH = os.environ.get("PLANNER_FONT", "/usr/share/fonts/truetype/nanum/NanumGothic.ttf")
KEEP_SECONDS = int(os.environ.get("KEEP_SECONDS", "3600"))      # 결과 파일 보관 1시간
MAX_RUNNING = int(os.environ.get("MAX_RUNNING", "2"))            # 동시에 만드는 개수
MAX_PER_IP_PER_10MIN = int(os.environ.get("MAX_PER_IP_PER_10MIN", "20"))
MAX_PREVIEW_PER_IP_PER_10MIN = int(os.environ.get("MAX_PREVIEW_PER_IP_PER_10MIN", "60"))
PREVIEW_WIDTH = 960          # 미리보기 그림 폭(px) — 폰에서 크게 보기(확대)해도 글자가 보이게
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get(
    "ALLOWED_ORIGINS",
    "https://goodnotes-digital-planner.vercel.app,http://localhost:5173,http://localhost:4173",
).split(",") if o.strip()]
WORK_DIR = os.environ.get("WORK_DIR", os.path.join(tempfile.gettempdir(), "planner-jobs"))
os.makedirs(WORK_DIR, exist_ok=True)

app = FastAPI(title="Goodnotes Planner API", version="1.0.0", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # Vercel 미리보기 주소(goodnotes-digital-planner-xxxx.vercel.app)도 허용
    allow_origin_regex=r"https://goodnotes-digital-planner(-[a-z0-9-]+)?\.vercel\.app",
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Idempotency-Key"],
    expose_headers=["Content-Disposition", "X-Request-Id"],
)


def font_ready():
    return os.path.exists(FONT_PATH)


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def error(status, code, message, errors=None, request_id=None):
    return JSONResponse(status_code=status, content={
        "code": code, "message": message, "errors": errors or [], "requestId": request_id or uuid.uuid4().hex,
    })


# ---------- 입력 계약 ----------
class PlannerSettings(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    year: int = Field(ge=2000, le=2100)
    weekStart: Literal["monday", "sunday"]
    lang: Literal["ko", "en", "ko-en"]
    theme: Literal["navy", "sage", "rose", "mono"]
    paper: Literal["tablet-landscape", "goodnotes-portrait", "a4-portrait"] = "tablet-landscape"
    linkScope: Literal["full", "monthly"] = "full"
    weekly: bool
    daily: bool
    notes: int = Field(ge=1, le=50)
    title: str = Field(default="", max_length=40)
    startMonth: int = Field(default=1, ge=1, le=12)
    months: int = Field(default=12, ge=1, le=18)
    holidays: bool = False


FIELD_MSG = {
    "year": "2000~2100 사이 정수여야 합니다", "notes": "1~50 사이 정수여야 합니다",
    "weekStart": "monday 또는 sunday", "lang": "ko, en, ko-en 중 하나", "theme": "navy, sage, rose, mono 중 하나",
    "paper": "tablet-landscape, goodnotes-portrait, a4-portrait 중 하나", "linkScope": "full 또는 monthly",
    "weekly": "true 또는 false", "daily": "true 또는 false", "title": "40자 이하 글자",
    "startMonth": "1~12 사이 정수여야 합니다", "months": "1~18 사이 정수여야 합니다", "holidays": "true 또는 false",
}


@app.exception_handler(RequestValidationError)
async def on_invalid(request: Request, exc: RequestValidationError):
    errs = []
    for e in exc.errors():
        loc = [str(x) for x in e.get("loc", []) if x != "body"]
        field = loc[0] if loc else "body"
        if e.get("type") == "extra_forbidden":
            reason = "허용되지 않은 항목입니다"
        elif field == "body":
            reason = "JSON 형식이 아닙니다"
        else:
            reason = FIELD_MSG.get(field, "값을 확인해 주세요")
        errs.append({"field": field, "reason": reason})
    return error(422, "VALIDATION_ERROR", "요청 설정을 확인해 주세요.", errs)


def to_config(s: PlannerSettings, font):
    return PlannerConfig(year=s.year, week_start=s.weekStart, lang=s.lang, theme=s.theme,
                         include_weekly=s.weekly, include_daily=s.daily, note_pages=s.notes,
                         title=s.title, paper=s.paper, link_scope=s.linkScope, font_path=font,
                         start_month=s.startMonth, months=s.months, holidays=s.holidays)


# ---------- 작업 저장소 (메모리) ----------
JOBS = {}
LOCK = threading.Lock()
SLOTS = threading.BoundedSemaphore(MAX_RUNNING)
HITS = {}   # ip → [시각...]
PREVIEW_HITS = {}
PREVIEW_CACHE = OrderedDict()   # 설정(JSON) → 결과. 같은 설정을 다시 보면 바로 돌려준다
PREVIEW_CACHE_MAX = 32


def public(job):
    out = {k: job[k] for k in ("generationId", "status", "stage", "createdAt", "updatedAt")}
    out["progress"] = None   # 엔진이 진행률을 주지 않으므로 숫자를 지어내지 않는다
    out["expiresAt"] = job.get("expiresAt")
    if job["status"] == "succeeded":
        out["result"] = job["result"]
        out["completedAt"] = job["updatedAt"]
    if job["status"] == "failed":
        out["error"] = job["error"]
    return out


def set_job(jid, **kw):
    with LOCK:
        JOBS[jid].update(kw, updatedAt=now_iso())


def run_job(jid, settings: PlannerSettings):
    job_dir = JOBS[jid]["dir"]
    try:
        with SLOTS:
            set_job(jid, status="processing", stage="pdf_generation")
            needs_korean = settings.lang in ("ko", "ko-en") or any(ord(ch) > 127 for ch in settings.title)
            if needs_korean and not font_ready():
                set_job(jid, status="failed", stage="failed",
                        error={"code": "GENERATION_FAILED", "message": "서버에 한글 글꼴이 없어 만들 수 없습니다."})
                return
            name = f"planner_{settings.year}_{settings.lang}_{settings.theme}"
            if (settings.startMonth, settings.months) != (1, 12):
                name += f"_{settings.startMonth:02d}m{settings.months}"
            if settings.paper != "tablet-landscape":
                name += f"_{settings.paper}"
            pdf = os.path.join(job_dir, name + ".pdf")
            t0 = time.time()
            info = generate(to_config(settings, FONT_PATH if font_ready() else ""), pdf)
            set_job(jid, status="verifying", stage="pdf_validation")
            check = validate_pdf(pdf)
            if not check["ok"]:
                set_job(jid, status="failed", stage="failed",
                        error={"code": "PDF_VALIDATION_FAILED",
                               "message": "만든 PDF의 링크 검사를 통과하지 못해 내려받기를 막았습니다."})
                return
            with LOCK:
                JOBS[jid]["pdf"] = pdf
            set_job(jid, status="succeeded", stage="done", result={
                "fileName": name + ".pdf",
                "pageCount": check["pages"], "linkCount": check["links"],
                "brokenLinkCount": len(check["broken"]), "sizeMb": check["size_mb"],
                "validationPassed": True, "expectedPages": info["pages"],
                "seconds": round(time.time() - t0, 1),
                "downloadUrl": f"/api/v1/generations/{jid}/download",
            })
    except Exception:  # 상세 오류는 응답에 넣지 않는다
        set_job(jid, status="failed", stage="failed",
                error={"code": "GENERATION_FAILED", "message": "PDF 생성에 실패했습니다. 설정은 그대로 남아 있습니다."})


def cleanup():
    """보관 시간이 지난 작업은 expired 로 바꾸고 파일을 지운다."""
    cutoff = time.time() - KEEP_SECONDS
    with LOCK:
        for jid, job in list(JOBS.items()):
            if job["t"] < cutoff and job["status"] not in ("queued", "processing", "verifying"):
                shutil.rmtree(job["dir"], ignore_errors=True)
                job.update(status="expired", stage="expired", pdf=None)
            if job["t"] < cutoff - 86400:
                JOBS.pop(jid, None)
        for hits in (HITS, PREVIEW_HITS):
            for ip in list(hits):
                hits[ip] = [t for t in hits[ip] if t > time.time() - 600]
                if not hits[ip]:
                    hits.pop(ip)


def client_ip(request: Request):
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() or (request.client.host if request.client else "unknown")


# ---------- 엔드포인트 ----------
@app.get("/")
def root():
    return {"service": "goodnotes-planner-api", "health": "/health"}


@app.get("/health")
def health():
    return {"status": "ok", "fontReady": font_ready(), "running": MAX_RUNNING - SLOTS._value, "time": now_iso(),
            "commit": os.environ.get("RENDER_GIT_COMMIT", "")[:7]}   # Render 가 넣어 주는 배포 커밋


@app.get("/api/v1/planner/options")
def options():
    return {
        "defaults": {"year": 2027, "weekStart": "monday", "lang": "ko", "theme": "navy",
                     "paper": "tablet-landscape", "linkScope": "full", "weekly": True, "daily": True, "notes": 5,
                     "startMonth": 1, "months": 12, "holidays": True},
        "constraints": {"year": {"min": 2000, "max": 2100}, "weekStart": ["monday", "sunday"],
                        "lang": ["ko", "en", "ko-en"], "theme": list(THEMES), "paper": list(PAPERS),
                        "linkScope": ["full", "monthly"], "notes": {"min": 1, "max": 50},
                        "startMonth": {"min": 1, "max": 12}, "months": {"min": 1, "max": 18}},
    }


@app.post("/api/v1/planner/validate")
def validate_settings(settings: PlannerSettings):
    return {"valid": True, "errors": []}


@app.post("/api/v1/generations", status_code=202)
def create_generation(settings: PlannerSettings, request: Request):
    cleanup()
    ip = client_ip(request)
    with LOCK:
        hits = HITS.setdefault(ip, [])
        if len(hits) >= MAX_PER_IP_PER_10MIN:
            return error(429, "RATE_LIMITED", "잠시 후 다시 시도해 주세요. (10분에 20번까지)")
        hits.append(time.time())
        jid = str(uuid.uuid4())
        job_dir = os.path.join(WORK_DIR, jid)
        os.makedirs(job_dir)
        expires = datetime.fromtimestamp(time.time() + KEEP_SECONDS, timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        JOBS[jid] = {"generationId": jid, "status": "queued", "stage": "queued", "createdAt": now_iso(),
                     "updatedAt": now_iso(), "dir": job_dir, "t": time.time(), "pdf": None, "expiresAt": expires}
    threading.Thread(target=run_job, args=(jid, settings), daemon=True).start()
    return {"generationId": jid, "status": "queued", "statusUrl": f"/api/v1/generations/{jid}", "createdAt": JOBS[jid]["createdAt"]}


@app.get("/api/v1/generations/{jid}")
def get_generation(jid: str):
    cleanup()
    job = JOBS.get(jid)
    if not job:
        return error(404, "GENERATION_NOT_FOUND", "작업을 찾을 수 없습니다. 다시 만들어 주세요.")
    return public(job)


@app.get("/api/v1/generations/{jid}/download")
def download(jid: str):
    cleanup()
    job = JOBS.get(jid)
    if not job:
        return error(404, "GENERATION_NOT_FOUND", "작업을 찾을 수 없습니다. 다시 만들어 주세요.")
    if job["status"] == "expired":
        return error(410, "FILE_EXPIRED", "파일 보관 시간(1시간)이 지났습니다. 다시 만들어 주세요.")
    if job["status"] != "succeeded" or not job.get("pdf") or not os.path.exists(job["pdf"]):
        return error(409, "NOT_READY", "아직 내려받을 수 있는 상태가 아닙니다.")
    return FileResponse(job["pdf"], media_type="application/pdf", filename=job["result"]["fileName"])


# ---------- 미리보기 ----------
def _preview_pages(info, settings: PlannerSettings):
    """보여 줄 쪽: 표지·연간·첫 달·첫 주·첫날·노트 (설정에 없는 페이지는 빼고)."""
    from engine.calendar_utils import period_months, period_range, weeks_between, month_key, week_key, day_key
    dp = info["dest_page"]
    (y, m) = period_months(settings.year, settings.startMonth, settings.months)[0]
    start, end = period_range(settings.year, settings.startMonth, settings.months)
    want = [("cover", "표지", "cover"), ("year", "연간", "year"), ("month", "월간", month_key(y, m))]
    if settings.weekly:
        want.append(("week", "주간", week_key(weeks_between(start, end, settings.weekStart)[0])))
    if settings.daily:
        want.append(("day", "일간", day_key(start)))
    want.append(("notes", "노트", "notes_1"))
    return [(k, label, dp[key]) for k, label, key in want if key in dp]


@app.post("/api/v1/previews")
def create_preview(settings: PlannerSettings, request: Request):
    """현재 설정으로 실제 PDF를 만든 뒤, 대표 쪽을 그림(JPEG)으로 돌려준다. 파일은 남기지 않는다."""
    cleanup()
    key = json.dumps(settings.model_dump(), sort_keys=True)
    with LOCK:
        if key in PREVIEW_CACHE:
            PREVIEW_CACHE.move_to_end(key)
            return {**PREVIEW_CACHE[key], "cached": True}
        ip = client_ip(request)
        hits = PREVIEW_HITS.setdefault(ip, [])
        if len(hits) >= MAX_PREVIEW_PER_IP_PER_10MIN:
            return error(429, "RATE_LIMITED", "미리보기를 너무 자주 요청했습니다. 잠시 후 다시 시도해 주세요.")
        hits.append(time.time())
    needs_korean = settings.lang in ("ko", "ko-en") or any(ord(ch) > 127 for ch in settings.title)
    if needs_korean and not font_ready():
        return error(503, "FONT_MISSING", "서버에 한글 글꼴이 없어 미리보기를 만들 수 없습니다.")
    tmp = tempfile.mkdtemp(dir=WORK_DIR)
    try:
        import pypdfium2 as pdfium
        pdf_path = os.path.join(tmp, "preview.pdf")
        with SLOTS:
            info = generate(to_config(settings, FONT_PATH if font_ready() else ""), pdf_path)
            doc = pdfium.PdfDocument(pdf_path)
            pages = []
            for kind, label, page_no in _preview_pages(info, settings):
                page = doc[page_no - 1]
                img = page.render(scale=PREVIEW_WIDTH / page.get_width()).to_pil().convert("RGB")
                buf = io.BytesIO()
                img.save(buf, "JPEG", quality=82, optimize=True)
                pages.append({"kind": kind, "label": label, "pageNumber": page_no,
                              "width": img.width, "height": img.height,
                              "image": "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()})
            doc.close()
        result = {"pageCount": info["pages"], "linkCount": info["links"], "pages": pages}
        with LOCK:
            PREVIEW_CACHE[key] = result
            while len(PREVIEW_CACHE) > PREVIEW_CACHE_MAX:
                PREVIEW_CACHE.popitem(last=False)
        return {**result, "cached": False}
    except Exception:
        return error(500, "PREVIEW_FAILED", "미리보기를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
