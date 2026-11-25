# PRJ-0001 굿노트 디지털 플래너 생성기 (플래너 스튜디오)

설정을 고르면 **하이퍼링크가 걸린 플래너 PDF**를 만들어 주고, 판매용 상품 문구·대표 이미지 초안까지 준비해 주는 도구입니다.

- 화면(웹): https://goodnotes-digital-planner.vercel.app (Vercel, 무료)
- PDF 서버: https://goodnotes-planner-api.onrender.com (Render 무료, 오래 안 쓰면 잠들어 첫 요청이 1분쯤 걸림)

## 할 수 있는 것
| 구분 | 내용 |
|---|---|
| 기간 | 시작 연도·시작 달, 1~18개월 |
| 모양 | 주 시작(월/일), 언어(한국어·영어·한영 병기), 용지 3종(태블릿 가로, 굿노트 세로, A4) |
| 꾸미기 | 테마 8종(네이비·세이지·로즈·모노·파스텔·다크·빈티지·테라코타) + 메인색 직접 고르기, 나눔 글꼴 5종, 표지 제목·이름·한 줄 다짐 |
| 구성 | 주간·일간 켜고 끄기, 한국 공휴일, 추가 페이지(목표·습관·독서·가계부), 일간 속지 3종, 노트 1~50쪽·속지 4종 |
| 링크 | 전체 연결 또는 월간 이동만. 만든 뒤 링크를 모두 검사하고 깨진 링크가 있으면 내려받기를 막음 |
| 상품 준비 | 한국어·영어 상품명·설명·태그(수정·복사), 대표 이미지 JPG, 등록 체크리스트 |
| 기록 | 만든 PDF 기록 30개, 자주 쓰는 설정 20개, 모두 지우기, 서버 상태 (모두 이 기기 브라우저에만 저장) |

판매처(Etsy 등) 등록은 자동으로 하지 않습니다. 문구·이미지 초안까지만 만듭니다.

## 빠른 시작 (PC 명령어)
```bash
pip install -r requirements.txt
python -m engine.cli --year 2027 --lang ko --theme navy --out output
python -m engine.cli --year 2028 --week-start sunday --lang en --out output       # 일요일 시작 영문
python -m engine.cli --year 2027 --theme custom --custom-color "#E07A5F" --font-family pen \
  --title "나의 2027" --owner "홍길동" --motto "매일 조금씩" --out output
python -m pytest -q   # 테스트
```
기타 옵션: `--paper`, `--links full|monthly`, `--start-month`, `--months`, `--holidays`, `--extras goals,habits,reading,budget`, `--daily-layout`, `--note-style`
결과: `output/planner_*.pdf`, `output/previews/*.png`, `output/listing_copy.json` (한국어·영어 문구 포함)

## 구조
| 폴더 | 내용 |
|---|---|
| engine/ | Python 엔진 (설정 검증, 달력·공휴일, PDF 그리기, 링크 검증, 상품 문구) |
| server/ | FastAPI 서버 (생성 작업, 미리보기, 입력 검사) + Dockerfile |
| ui/ | React 화면 6개 (홈·만들기·미리보기·PDF·상품·설정) |
| desktop/ | Electron 포장 (PC에서 엔진 직접 실행) |
| scripts/ | Render 배포 스크립트 (GitHub Actions 에서 실행) |
| tests/ | 엔진·서버 테스트 |
| docs/ | 설계 문서 |

배포: `main` 에 올리면 GitHub Actions 가 테스트 → Render 서버 배포, Vercel 이 화면을 자동 배포합니다.

## 글꼴·저작권
나눔 글꼴(SIL OFL)만 씁니다. PDF에 넣어 상업 판매할 수 있지만 글꼴 파일만 따로 파는 것은 안 됩니다.
서버·CI는 `fonts-nanum`, `fonts-nanum-extra`(손글씨 펜) 패키지로 설치합니다. PC에서 쓰려면 `--font 나눔고딕.ttf 경로` 를 주세요(같은 폴더의 다른 나눔 글꼴도 찾아 씀).

## 개발 단계 (2026-11-25 완료)
| 단계 | 내용 |
|---|---|
| 1~2 | 화면 틀, 공통 부품(디자인 시스템) |
| 3~5 | 엔진 옵션, 만들기 화면, 서버 + PDF 내려받기 |
| 6~8 | 기간·공휴일, 디자인 미리보기, 추가 페이지·속지 |
| 9 | 꾸미기 (테마·내 색·글꼴·표지 글) |
| 10 | 상품 등록 관리, 기록·자주 쓰는 설정, 서버 상태, 문서 정리 |

## 테스트 현황 (2026-11-25)
- 엔진·서버 131개 통과 (한글 글꼴 설치 상태, GitHub Actions 에서도 실행)
- 화면 로직 23개 통과 (`cd ui && npm test`)
- 브라우저 자동 점검: 만들기 → 미리보기 → PDF 생성 → 상품 문구·이미지 → 기록·설정 저장·모두 지우기
- 사람이 확인할 것: 굿노트 앱에서 실제 링크 동작, 아이폰에서 이미지 내려받기, Electron 창 실행
