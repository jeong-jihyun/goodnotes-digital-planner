"""플래너 설정 검증. 잘못된 값은 ValueError로 알려 준다."""
from dataclasses import dataclass, field
import re

# 테마 색: main(머리띠·선), sub(연한 칸·탭), text(글자), bg(종이), on_main(머리띠 위 글자)
THEMES = {
    "navy": {"main": "#1F3864", "sub": "#DCE6F5", "text": "#222222"},
    "sage": {"main": "#5B7F6A", "sub": "#E3EEE7", "text": "#222222"},
    "rose": {"main": "#B45A6E", "sub": "#F7E3E8", "text": "#222222"},
    "mono": {"main": "#333333", "sub": "#EEEEEE", "text": "#111111"},
    # 9단계 추가
    "pastel": {"main": "#8C7BC4", "sub": "#ECE6F7", "text": "#3E3852"},
    "dark": {"main": "#8AB4F8", "sub": "#2E3446", "text": "#E7EAF1", "bg": "#1C2030", "on_main": "#1C2030"},
    "vintage": {"main": "#7A5C3E", "sub": "#EEE2CC", "text": "#4A3828", "bg": "#FBF6EA"},
    "terracotta": {"main": "#BF603D", "sub": "#F6E1D6", "text": "#4F2D21"},
}
THEME_DEFAULTS = {"bg": "#FFFFFF", "on_main": "#FFFFFF"}

# 글꼴 (모두 나눔 글꼴, SIL OFL — 상업용 PDF 에 넣어도 됨). 같은 폴더에 있는 파일 이름
FONTS = {
    "gothic": "NanumGothic.ttf",
    "myeongjo": "NanumMyeongjo.ttf",
    "barun": "NanumBarunGothic.ttf",
    "squareround": "NanumSquareRoundR.ttf",
    "pen": "NanumPen.ttf",
}


def _hex(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i+2], 16) for i in (0, 2, 4))


def _mix(a, b, t):
    """색 a 와 b 를 t(0~1) 비율로 섞는다."""
    ra, rb = _hex(a), _hex(b)
    return "#" + "".join(f"{round(x + (y - x) * t):02X}" for x, y in zip(ra, rb))


def _luminance(c):
    r, g, b = (v / 255 for v in _hex(c))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def custom_theme(color):
    """메인색 하나로 나머지 색을 맞춘다: 아주 연한 보조색, 진한 글자색, 머리띠 위 글자색(밝기에 따라)."""
    return {
        "main": color.upper(),
        "sub": _mix(color, "#FFFFFF", 0.86),
        "text": _mix(color, "#000000", 0.62),
        "on_main": "#222222" if _luminance(color) > 0.62 else "#FFFFFF",
    }


def contrast(a, b):
    """두 색의 명암 대비 (WCAG 방식, 1~21). 4.5 이상이면 작은 글자도 잘 읽힘."""
    def lum(c):
        def ch(v):
            v /= 255
            return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
        r, g, b = (ch(v) for v in _hex(c))
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def theme_colors(cfg):
    t = custom_theme(cfg.custom_color) if cfg.theme == "custom" else THEMES[cfg.theme]
    t = {**THEME_DEFAULTS, **t}
    # ink: 종이 위에 그리는 날짜·제목·선 색. 메인색이 너무 밝아(노랑 등) 안 읽히면 읽힐 때까지 진하게
    ink, toward = t["main"], ("#000000" if contrast(t["bg"], "#000000") > contrast(t["bg"], "#FFFFFF") else "#FFFFFF")
    step = 0
    while contrast(ink, t["bg"]) < 3.0 and step < 10:
        step += 1
        ink = _mix(t["main"], toward, step * 0.1)
    t["ink"] = ink
    return t

# 용지 모양 (폭, 높이 pt). 1pt = 1/72인치
PAPERS = {
    "tablet-landscape": (842, 595),    # 태블릿 가로형 (A4 가로, 기존 기본값)
    "goodnotes-portrait": (600, 800),  # 굿노트 세로형 (아이패드 세로 3:4 비율)
    "a4-portrait": (595, 842),         # A4 인쇄형 (A4 세로)
}

LANGS = ("ko", "en", "ko-en")
EXTRAS = ("goals", "habits", "reading", "budget")       # 추가 페이지 (8단계)
DAILY_LAYOUTS = ("plan-todo", "timetable", "lined")    # 일간 속지
NOTE_STYLES = ("grid", "lined", "dot", "blank")        # 노트 속지          # ko-en: 한국어+영어 나란히
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
    title: str = ""              # 표지 제목 (비우면 '디지털 플래너')
    font_path: str = ""          # 선택: 한글 TTF 경로 (없으면 내장 CID 폰트)
    owner: str = ""              # 표지 이름
    motto: str = ""              # 표지 한 줄 다짐
    custom_color: str = ""       # theme="custom" 일 때 메인색 #RRGGBB
    font_family: str = "gothic"  # FONTS 중 하나
    paper: str = "tablet-landscape"   # PAPERS 중 하나
    link_scope: str = "full"          # full | monthly
    start_month: int = 1              # 기간 시작 달 (1~12). year 는 시작 연도
    months: int = 12                  # 기간 길이 (1~18개월)
    holidays: bool = False            # 한국 공휴일·주말 색 표시
    extras: tuple = ()                # 추가 페이지: goals, habits, reading, budget
    daily_layout: str = "plan-todo"   # 일간 속지
    note_style: str = "grid"          # 노트 속지

    def validate(self):
        if not isinstance(self.year, int) or not 2000 <= self.year <= 2100:
            raise ValueError("year는 2000~2100 사이 정수여야 합니다")
        if self.week_start not in ("monday", "sunday"):
            raise ValueError("week_start는 monday 또는 sunday")
        if self.lang not in LANGS:
            raise ValueError("lang은 ko, en, ko-en 중 하나")
        if self.theme == "custom":
            if not re.fullmatch(r"#[0-9A-Fa-f]{6}", self.custom_color or ""):
                raise ValueError("custom 테마는 custom_color(#RRGGBB)가 필요합니다")
        elif self.theme not in THEMES:
            raise ValueError(f"theme은 {list(THEMES)} 또는 custom")
        if self.font_family not in FONTS:
            raise ValueError(f"font_family는 {list(FONTS)} 중 하나")
        for name, val, n in (("title", self.title, 40), ("owner", self.owner, 30), ("motto", self.motto, 60)):
            if len(val or "") > n:
                raise ValueError(f"{name}은 {n}자 이하")
        if not 0 <= self.note_pages <= 50:
            raise ValueError("note_pages는 0~50")
        if self.paper not in PAPERS:
            raise ValueError(f"paper는 {list(PAPERS)} 중 하나")
        if not 1 <= self.start_month <= 12:
            raise ValueError("start_month는 1~12")
        if not 1 <= self.months <= 18:
            raise ValueError("months는 1~18")
        bad = set(self.extras or ()) - set(EXTRAS)
        if bad:
            raise ValueError(f"extras는 {EXTRAS} 중에서 골라야 합니다 (모르는 값: {sorted(bad)})")
        self.extras = tuple(x for x in EXTRAS if x in set(self.extras or ()))   # 순서 고정·중복 제거
        if self.daily_layout not in DAILY_LAYOUTS:
            raise ValueError(f"daily_layout은 {DAILY_LAYOUTS} 중 하나")
        if self.note_style not in NOTE_STYLES:
            raise ValueError(f"note_style은 {NOTE_STYLES} 중 하나")
        if self.link_scope not in LINK_SCOPES:
            raise ValueError("link_scope는 full 또는 monthly")
        return self

    @staticmethod
    def check_color(code: str):
        if not re.fullmatch(r"#[0-9A-Fa-f]{6}", code):
            raise ValueError("색상은 #RRGGBB 형식")
