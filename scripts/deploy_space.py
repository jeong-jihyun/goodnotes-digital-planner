"""GitHub Actions 에서 Hugging Face Space 로 API 서버를 올린다.
필요: 저장소 Secret HF_TOKEN (Hugging Face 'Write' 접속 키)
Space 이름: <HF 사용자이름>/goodnotes-planner-api  (사용자이름은 접속 키로 자동 확인)
"""
import os, shutil, tempfile
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
print(f"SPACE_URL=https://{user.lower()}-{SPACE_NAME}.hf.space")
print(f"SPACE_PAGE=https://huggingface.co/spaces/{repo_id}")
