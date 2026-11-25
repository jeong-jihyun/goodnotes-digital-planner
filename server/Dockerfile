# Render 무료 웹 서비스(Docker) 용. 저장소 맨 위 폴더를 기준으로 빌드한다 (engine/ 를 함께 넣기 위해).
#   빌드: docker build -f server/Dockerfile -t planner-api .
FROM python:3.11-slim

# 한글 글꼴(나눔고딕, OFL) — PDF에 내장해 굿노트에서 한글이 보이게 한다
RUN apt-get update && apt-get install -y --no-install-recommends fonts-nanum fonts-nanum-extra \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 app
USER app
ENV HOME=/home/app PATH=/home/app/.local/bin:$PATH \
    PLANNER_FONT=/usr/share/fonts/truetype/nanum/NanumGothic.ttf \
    PYTHONUNBUFFERED=1
WORKDIR /home/app/srv

COPY --chown=app server/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt
COPY --chown=app engine ./engine
COPY --chown=app server/app.py .

# Render 는 PORT 환경변수로 포트를 알려 준다 (없으면 10000)
EXPOSE 10000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-10000}"]
