# Hugging Face Spaces (Docker) 용. 무료 CPU 등급에서 실행된다.
FROM python:3.11-slim

# 한글 글꼴(나눔고딕, OFL) — PDF에 내장해 굿노트에서 한글이 보이게 한다
RUN apt-get update && apt-get install -y --no-install-recommends fonts-nanum \
    && rm -rf /var/lib/apt/lists/*

# Spaces 는 uid 1000 사용자로 실행한다
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH \
    PLANNER_FONT=/usr/share/fonts/truetype/nanum/NanumGothic.ttf \
    PYTHONUNBUFFERED=1
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt
COPY --chown=user . .

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
