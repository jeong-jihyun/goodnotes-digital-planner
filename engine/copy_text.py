"""플랫폼별 상품 문구 초안. 최종 문구는 사람이 다듬는다."""


PAPER_KO = {"tablet-landscape": "태블릿 가로형", "goodnotes-portrait": "굿노트 세로형", "a4-portrait": "A4 인쇄형(세로)"}
PAPER_EN = {"tablet-landscape": "tablet landscape", "goodnotes-portrait": "GoodNotes portrait", "a4-portrait": "A4 printable portrait"}


EXTRA_KO = {"goals": "연간·월간 목표", "habits": "월별 습관 트래커", "reading": "독서 기록", "budget": "월별 가계부"}
EXTRA_EN = {"goals": "yearly & monthly goals", "habits": "monthly habit tracker", "reading": "reading log", "budget": "monthly budget"}


THEME_KO = {"navy": "네이비", "sage": "세이지", "rose": "로즈", "mono": "모노", "pastel": "파스텔",
            "dark": "다크", "vintage": "빈티지", "terracotta": "테라코타", "custom": "맞춤 색"}
THEME_EN = {"navy": "navy", "sage": "sage", "rose": "rose", "mono": "mono", "pastel": "pastel",
            "dark": "dark mode", "vintage": "vintage", "terracotta": "terracotta", "custom": "custom color"}
FONT_KO = {"gothic": "나눔고딕", "myeongjo": "나눔명조", "barun": "나눔바른고딕", "squareround": "나눔스퀘어라운드", "pen": "나눔손글씨 펜"}
FONT_EN = {"gothic": "clean sans", "myeongjo": "serif", "barun": "modern sans", "squareround": "rounded", "pen": "handwritten"}
LANG_KO = {"ko": "한국어", "en": "영어", "ko-en": "한국어·영어 병기"}
LANG_EN = {"ko": "Korean", "en": "English", "ko-en": "Korean + English"}


def make_copy_both(cfg, info):
    """판매처별로 쓰도록 한국어 문구와 영어 문구를 함께 만든다."""
    return {"ko": make_copy(cfg, info, "ko"), "en": make_copy(cfg, info, "en")}


def _period(cfg):
    """(기본 기간 여부, '2027.03 - 2028.02' 같은 표기)"""
    from .calendar_utils import period_months
    ms = period_months(cfg.year, getattr(cfg, "start_month", 1), getattr(cfg, "months", 12))
    if len(ms) == 12 and ms[0][1] == 1:
        return True, str(cfg.year)
    return False, f"{ms[0][0]}.{ms[0][1]:02d} - {ms[-1][0]}.{ms[-1][1]:02d}"


def make_copy(cfg, info, lang=None):
    """lang 을 안 주면 플래너 언어에 맞춘다 (한영 병기 상품도 한국어 문구로 시작)."""
    ko = (lang or cfg.lang) in ("ko", "ko-en")
    theme, font = getattr(cfg, "theme", "navy"), getattr(cfg, "font_family", "gothic")
    default_period, period = _period(cfg)
    y = cfg.year if default_period else period
    hol = getattr(cfg, "holidays", False)
    if ko:
        title = f"{y} 굿노트 디지털 플래너 | 하이퍼링크 연간·월간{'·주간' if cfg.include_weekly else ''}{'·일간' if cfg.include_daily else ''}"
        intro = (f"{y}년 한 해를 계획하는 하이퍼링크 플래너 PDF입니다.\n" if default_period
                 else f"{period} ({cfg.months}개월) 기간을 계획하는 하이퍼링크 플래너 PDF입니다.\n")
        desc = (intro +
                f"- 총 {info['pages']}페이지, 링크 {info['links']}개 (오른쪽 탭을 누르면 해당 월로 이동)\n"
                f"- 주 시작 요일: {'월요일' if cfg.week_start=='monday' else '일요일'}\n"
                f"- 용지: {PAPER_KO[cfg.paper]} · 플래너 글자: {LANG_KO[cfg.lang]}\n"
                f"- 디자인: {THEME_KO.get(theme, theme)} 테마 · {FONT_KO.get(font, font)} 글꼴\n"
                f"{'- 한국 공휴일(대체공휴일 포함) 표시, 일요일 빨강·토요일 파랑' + chr(10) if hol else ''}"
                f"{'- 추가 페이지: ' + ', '.join(EXTRA_KO[x] for x in getattr(cfg, 'extras', ())) + chr(10) if getattr(cfg, 'extras', ()) else ''}"
                "- 굿노트, 노타빌리티 등 PDF 주석 앱에서 사용하세요.\n"
                "- 디지털 상품이므로 다운로드 후 교환·환불이 어렵습니다.")
        tags = ["굿노트", "디지털플래너", f"{cfg.year}플래너", "아이패드다이어리", "하이퍼링크"]   # 태그는 짧게: 시작 연도만
    else:
        parts = " ".join(["Yearly Monthly"] + (["Weekly"] if cfg.include_weekly else []) + (["Daily"] if cfg.include_daily else []))
        title = f"{y} Digital Planner for GoodNotes | Hyperlinked {parts}"
        intro = (f"A hyperlinked {y} planner PDF.\n" if default_period
                 else f"A hyperlinked planner PDF for {period} ({cfg.months} months).\n")
        desc = (intro +
                f"- {info['pages']} pages, {info['links']} links (tap the side tabs to jump to a month)\n"
                f"- Week starts on {cfg.week_start.title()}\n"
                f"- Paper: {PAPER_EN[cfg.paper]} · Planner language: {LANG_EN[cfg.lang]}\n"
                f"- Design: {THEME_EN.get(theme, theme)} theme, {FONT_EN.get(font, font)} font\n"
                f"{'- Korean public holidays marked' + chr(10) if hol else ''}"
                f"{'- Extra pages: ' + ', '.join(EXTRA_EN[x] for x in getattr(cfg, 'extras', ())) + chr(10) if getattr(cfg, 'extras', ()) else ''}"
                "- Works with GoodNotes, Notability and other PDF annotation apps.\n"
                "- Digital product: no physical item will be shipped.")
        tags = ["goodnotes planner", "digital planner", f"{cfg.year} planner", "ipad planner", "hyperlinked"]   # Etsy 태그 20자 제한
    return {"title": title, "description": desc, "tags": tags}
