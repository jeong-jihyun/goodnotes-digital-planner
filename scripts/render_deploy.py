"""GitHub Actions 에서 Render 서버를 배포하고 결과를 확인한다.
필요: 저장소 Secret RENDER_API_KEY (Render API 키: Services 읽기, Deploys 쓰기, Monitoring 읽기)

하는 일
1) 이름으로 서비스를 찾는다 (goodnotes-planner-api)
2) 지금 커밋으로 배포를 시킨다
3) live / 실패가 될 때까지 기다린다 (최대 20분)
4) 실패하면 빌드·실행 기록의 마지막 부분을 GitHub 알림(annotation)으로 남긴다
   (Claude 작업 공간에서는 Render 에 직접 접속할 수 없어서, 이 알림으로 원인을 읽는다)
5) 성공하면 /health 의 커밋 번호와 새 기능(/api/v1/planner/options 의 months)을 확인한다
API 키 값은 어디에도 출력하지 않는다.
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request

API = "https://api.render.com/v1"
NAME = os.environ.get("RENDER_SERVICE_NAME", "goodnotes-planner-api")
KEY = os.environ.get("RENDER_API_KEY", "").strip()
SHA = os.environ.get("GITHUB_SHA", "")


def note(level, title, msg):
    msg = str(msg).replace("\r", "").replace("\n", " / ")[:3000]
    print(f"::{level} title={title}::{msg}", flush=True)


def fail(title, msg):
    note("error", title, msg)
    sys.exit(1)


def call(method, path, body=None, timeout=60):
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": f"Bearer {KEY}", "Accept": "application/json",
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:500]
        raise RuntimeError(f"{method} {path.split('?')[0]} → HTTP {e.code}: {detail}")


def logs(owner, service, kind, since):
    """빌드(build) 또는 실행(app) 기록의 마지막 줄들."""
    q = urllib.parse.urlencode({"ownerId": owner, "resource": service, "type": kind, "limit": 60,
                                "direction": "backward", "startTime": since,
                                "endTime": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
    try:
        data = call("GET", f"/logs?{q}")
    except Exception as e:
        return [f"(기록을 못 읽음: {e})"]
    lines = [x.get("message", "") for x in data.get("logs", [])]
    return list(reversed(lines))[-40:]


def http_get(url, timeout=60):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return json.loads(r.read())


def main():
    if not KEY:
        fail("RENDER_API_KEY 없음", "저장소 Settings > Secrets 에 RENDER_API_KEY 를 등록해 주세요.")

    # 1) 서비스 찾기
    try:
        found = call("GET", "/services?" + urllib.parse.urlencode({"name": NAME, "limit": 20}))
    except Exception as e:
        fail("서비스 조회 실패", e)
    svc = next((x["service"] for x in found if x.get("service", {}).get("name") == NAME), None)
    if not svc:
        fail("서비스 없음", f"Render 에서 '{NAME}' 서비스를 찾지 못했습니다. (키의 워크스페이스·Services 권한 확인)")
    sid, owner = svc["id"], svc.get("ownerId", "")
    url = (svc.get("serviceDetails") or {}).get("url") or f"https://{NAME}.onrender.com"
    note("notice", "서비스 확인", f"{NAME} id={sid} url={url} autoDeploy={svc.get('autoDeploy')} branch={svc.get('branch')}")

    # 2) 배포 시키기
    started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 60))
    body = {"clearCache": "do_not_clear"}
    if SHA:
        body["commitId"] = SHA
    try:
        dep = call("POST", f"/services/{sid}/deploys", body)
    except Exception as e:
        fail("배포 요청 실패", e)
    did = dep.get("id")
    print(f"배포 시작: {did} commit={SHA[:7]}", flush=True)

    # 3) 기다리기
    end_ok = {"live"}
    end_bad = {"build_failed", "update_failed", "canceled", "pre_deploy_failed", "deactivated"}
    status, deadline = dep.get("status"), time.time() + 20 * 60
    while time.time() < deadline:
        try:
            status = call("GET", f"/services/{sid}/deploys/{did}").get("status")
        except Exception as e:
            print(f"상태 조회 재시도: {e}", flush=True)
        print(f"[{time.strftime('%H:%M:%S')}] {status}", flush=True)
        if status in end_ok | end_bad:
            break
        time.sleep(15)

    if status not in end_ok:
        kind = "app" if status == "update_failed" else "build"
        tail = logs(owner, sid, kind, started)
        note("error", f"Render 배포 실패 ({status})", " | ".join(tail[-25:]) or "(기록 없음)")
        for ln in tail:
            print(ln)
        sys.exit(1)

    # 4) 성공: 실제로 새 버전이 응답하는지
    for attempt in range(12):
        try:
            h = http_get(url + "/health")
            o = http_get(url + "/api/v1/planner/options")
            has_new = "months" in o.get("constraints", {})
            note("notice", "Render 배포 성공", f"health={h} 새 기능(기간)={'있음' if has_new else '없음'}")
            if not has_new:
                fail("새 버전 아님", "배포는 live 인데 응답이 예전 버전입니다.")
            return
        except Exception as e:
            print(f"health 재시도 {attempt + 1}: {e}", flush=True)
            time.sleep(15)
    fail("서버 응답 없음", f"{url}/health 에 응답이 없습니다.")


if __name__ == "__main__":
    main()
