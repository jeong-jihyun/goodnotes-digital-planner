"""GitHub Actions 에서 Hugging Face Space 로 API 서버를 올린다.
필요: 저장소 Secret HF_TOKEN (Hugging Face 'Write' 접속 키)
Space 이름: <HF 사용자이름>/goodnotes-planner-api  (사용자이름은 접속 키로 자동 확인)
배포 뒤 Space 가 다 켜질 때까지 기다리고, 결과를 GitHub 실행 기록에 '알림(annotation)'으로 남긴다.
(Claude 작업 공간에서는 Hugging Face 에 직접 접속할 수 없어서, 이 알림으로 상태를 확인한다)
"""
import os, shutil, sys, tempfile, time, json, urllib.request
from huggingface_hub import HfApi

SPACE_NAME = os.environ.get("SPACE_NAME", "goodnotes-planner-api")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

token = os.environ["HF_TOKEN"]
api = HfApi(token=token)
user = api.whoami()["name"]
repo_id = f"{user}/{SPACE_NAME}"

# Space 에 올릴 파일만 모은다: server/* + engine/ (글꼴 파일·테스트·화면 코드는 제외)
stage = tempfile.mkdtemp()
for f in ("app.py", "requirements.txt", "Dockerfile"):
    shutil.copy(os.path.join(ROOT, "server", f), stage)
shutil.copy(os.path.join(ROOT, "server", "SPACE_README.md"), os.path.join(stage, "README.md"))
shutil.copytree(os.path.join(ROOT, "engine"), os.path.join(stage, "engine"),
                ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.ttf"))

api.create_repo(repo_id, repo_type="space", space_sdk="docker", exist_ok=True, private=False)
api.upload_folder(folder_path=stage, repo_id=repo_id, repo_type="space",
                  commit_message=f"deploy {os.environ.get('GITHUB_SHA', 'local')[:7]}",
                  delete_patterns=["*"])
info = api.space_info(repo_id)
host = getattr(info, "host", None) or f"https://{user.lower()}-{SPACE_NAME}.hf.space"
print(f"::notice title=Space 업로드::repo={repo_id} host={host} private={info.private}")

# 다 켜질 때까지 기다림 (최대 20분). 빌드 오류면 오류 문구를 남기고 실패 처리
deadline = time.time() + 20 * 60
stage = None
while time.time() < deadline:
    rt = api.get_space_runtime(repo_id)
    if rt.stage != stage:
        stage = rt.stage
        print(f"[{time.strftime('%H:%M:%S')}] stage={stage}", flush=True)
    if stage == "RUNNING":
        break
    if stage in ("BUILD_ERROR", "RUNTIME_ERROR", "CONFIG_ERROR", "NO_APP_FILE"):
        msg = (rt.raw or {}).get("errorMessage", "") or "(오류 문구 없음)"
        print(f"::error title=Space {stage}::{msg[:900].replace(chr(10), ' / ')}")
        sys.exit(1)
    time.sleep(20)
else:
    print(f"::error title=Space 시간 초과::20분 안에 켜지지 않음 (마지막 상태 {stage})")
    sys.exit(1)

# 켜졌으면 /health 를 직접 불러 본다 (한글 글꼴 포함 여부까지)
for attempt in range(10):
    try:
        with urllib.request.urlopen(host + "/health", timeout=30) as r:
            h = json.loads(r.read())
        print(f"::notice title=Space 정상::{host} health={h}")
        break
    except Exception as e:
        print(f"health 재시도 {attempt + 1}: {e}")
        time.sleep(15)
else:
    print(f"::error title=Space health 실패::{host}/health 응답 없음")
    sys.exit(1)
