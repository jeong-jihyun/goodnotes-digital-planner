"""플래너 설정 검증. 잘못된 값은 ValueError로 알려 준다."""
from dataclasses import dataclass, field
import re

THEMES = {
    "navy": {"main": "#1F3864", "sub": "#DCE6F5", "text": "#222222"},
    "sage": {"main": "#5B7F6A", "sub": "#E3EEE7", "text": "#222222"},
    "rose": {"main": "#B45A6E", "sub": "#F7E3E8", "text": "#222222"},
    "mono": {"main": "#333333", "sub": "#EEEEEE", "text": "#111111"},
}

# 용지 모양 (폭, 높이 pt). 1pt = 1/72인치
PAPERS = {
    "tablet-landscape": (842, 595),    # 태블릿 가로형 (A4 가로, 기존 기본값)
    "goodnotes-portrait": (600, 800),  # 굿노트 세로형 (아이패드 세로 3:4 비율)
    "a4-portrait": (595, 842),         # A4 인쇄형 (A4 세로)
}

LANGS = ("ko", "en", "ko-en")          # ko-en: 한국어+영어 나란히
LINK_SCOPES = ("full", "monthly")      # full: 월간→주간→일간까지 / monthly: 탭·월 이동만


@dataclass
class PlannerConfig:
    year: int = 2027
    week_start: str = "monday"   # monday | sunday
    lang: str = "ko"             # ko | en
    theme: str = "navy"
    include_weekly: bool = True
    include_daily: bool = True
    note_pages: int = 5
    title: str = ""
    font_path: str = ""          # 선택: 한글 TTF 경로 (없으면 내장 CID 폰트)
    paper: str = "tablet-landscape"   # PAPERS 중 하나
    link_scope: str = "full"          # full | monthly

    def validate(self):
        if not isinstance(self.year, int) or not 2000 <= self.year <= 2100:
            raise ValueError("year는 2000~2100 사이 정수여야 합니다")
        if self.week_start not in ("monday", "sunday"):
            raise ValueError("week_start는 monday 또는 sunday")
        if self.lang not in LANGS:
            raise ValueError("lang은 ko, en, ko-en 중 하나")
        if self.theme not in THEMES:
            raise ValueError(f"theme은 {list(THEMES)} 중 하나")
        if not 0 <= self.note_pages <= 50:
            raise ValueError("note_pages는 0~50")
        if self.paper not in PAPERS:
            raise ValueError(f"paper는 {list(PAPERS)} 중 하나")
        if self.link_scope not in LINK_SCOPES:
            raise ValueError("link_scope는 full 또는 monthly")
        return self

    @staticmethod
    def check_color(code: str):
        if not re.fullmatch(r"#[0-9A-Fa-f]{6}", code):
            raise ValueError("색상은 #RRGGBB 형식")
