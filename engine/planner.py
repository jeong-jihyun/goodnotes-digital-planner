"""하이퍼링크 플래너 PDF 생성기 (ReportLab).

용지 모양(paper)에 따라 페이지 크기가 바뀌므로, 모든 배치는 고정 숫자 대신 self.W / self.H 로 계산한다.
기간: year 년 start_month 월부터 months 개월 (1~18개월). 기본은 1월부터 12개월.
링크 범위(link_scope)
- full    : 오른쪽 탭 + 연간→월 + 연간·월간·주간→일간 + 월간→주간 + 주간·일간→월간
- monthly : 오른쪽 탭 + 연간→월 + 일간→월간(돌아가기)만. 날짜·주 누르기 없음
공휴일(holidays): 한국 공휴일은 빨간 날짜 + 이름, 일요일 빨강·토요일 파랑
"""
import os
from datetime import date, timedelta
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from .config import PlannerConfig, PAPERS, FONTS, theme_colors
from .labels import LABELS
from .calendar_utils import (month_grid, period_months, period_range, weeks_between,
                             days_between, day_key, week_key, month_key)
from .holidays_kr import kr_holidays

TAB_W = 46        # 오른쪽 탭 폭
LEFT = 40         # 왼쪽 여백 (월간 페이지에서는 주간 이동 칸으로도 씀)
WHITE = HexColor("#FFFFFF")
RED = HexColor("#D64545")      # 일요일·공휴일
BLUE = HexColor("#2F6FD0")     # 토요일

BUNDLED_FONT = os.path.join(os.path.dirname(__file__), "fonts", "NanumGothic.ttf")


def font_file(cfg):
    """고른 글꼴 파일 경로. 기본(나눔고딕) 파일과 같은 폴더에서 찾는다. 없으면 None."""
    base = cfg.font_path if cfg.font_path and os.path.exists(cfg.font_path) else BUNDLED_FONT
    path = os.path.join(os.path.dirname(base), FONTS[cfg.font_family])
    if os.path.exists(path):
        return path
    return base if (cfg.font_family == "gothic" and os.path.exists(base)) else None


def _font(cfg):
    """TTF를 PDF에 내장한다(보는 기기에 폰트가 없어도 한글이 보이도록).
    고른 글꼴이 없으면 기본 글꼴로 만든다 (서버는 미리 확인해서 거절한다)."""
    path = font_file(cfg)
    if path is None and os.path.exists(cfg.font_path or BUNDLED_FONT):
        path = cfg.font_path if cfg.font_path and os.path.exists(cfg.font_path) else BUNDLED_FONT
    if path:
        name = "PlannerFont_" + cfg.font_family
        pdfmetrics.registerFont(TTFont(name, path))
        return name
    return "Helvetica"  # 영어 전용 대체 (한글 불가)


class Planner:
    def __init__(self, cfg: PlannerConfig, path):
        self.cfg = cfg.validate()
        self.L = LABELS[cfg.lang]
        self.th = {k: HexColor(v) for k, v in theme_colors(cfg).items()}
        self.ink = self.th["ink"]                  # 종이 위 글자·선 (밝은 메인색이면 자동으로 진하게)
        self.on_main = self.th["on_main"]        # 머리띠·켜진 탭 위 글자색 (다크·밝은 사용자 색 대비)
        self.has_bg = theme_colors(cfg)["bg"].upper() != "#FFFFFF"
        self.font = _font(cfg)
        self.W, self.H = PAPERS[cfg.paper]
        self.portrait = self.H > self.W
        self.full_links = cfg.link_scope == "full"
        # 기간
        self.months = period_months(cfg.year, cfg.start_month, cfg.months)
        self.start, self.end = period_range(cfg.year, cfg.start_month, cfg.months)
        self.multi_year = self.months[0][0] != self.months[-1][0]
        # 공휴일 (기간에 걸친 연도 전체)
        years = tuple(sorted({y for y, _ in self.months}))
        self.hol = kr_holidays(years, cfg.lang) if cfg.holidays else {}
        self.c = canvas.Canvas(path, pagesize=(self.W, self.H))
        self.c.setTitle(cfg.title or f"{self.period_label()} {self.L['cover']}")
        self.links = []      # (페이지, 목적지 이름) 검증용
        self.dests = set()
        self.dest_page = {}
        self.pages = 0
        self.extras = set(cfg.extras)
        self.weeks = weeks_between(self.start, self.end, cfg.week_start) if cfg.include_weekly else []
        self.week_starts = set(self.weeks)   # 월간→주간 링크는 실제로 있는 페이지로만

    # ---- 공통 ----
    def period_label(self):
        """기본 기간(1월부터 12개월)이면 '2027', 아니면 '2027.03 - 2028.02'."""
        if self.cfg.start_month == 1 and self.cfg.months == 12:
            return str(self.cfg.year)
        (y1, m1), (y2, m2) = self.months[0], self.months[-1]
        if self.cfg.months == 1:
            return f"{y1}.{m1:02d}"
        return f"{y1}.{m1:02d} - {y2}.{m2:02d}"

    @property
    def content_w(self):
        return self.W - TAB_W - LEFT * 2

    def _dow(self, short=False):
        base = "dow_mon" if self.cfg.week_start == "monday" else "dow_sun"
        return self.L[base + ("_short" if short else "")]

    def _col_color(self, col):
        """요일 칸 번호 → 주말 색 (공휴일 표시를 켰을 때만)."""
        if not self.cfg.holidays:
            return None
        sun, sat = (6, 5) if self.cfg.week_start == "monday" else (0, 6)
        return RED if col == sun else BLUE if col == sat else None

    def _day_color(self, d, default):
        if not self.cfg.holidays:
            return default
        if d in self.hol or d.weekday() == 6:
            return RED
        if d.weekday() == 5:
            return BLUE
        return default

    def _fit(self, text, size, max_w, min_size=5):
        """글자가 칸보다 길면 글자 크기를 줄인다 (한영 병기·긴 공휴일 이름 넘침 방지)."""
        while size > min_size and pdfmetrics.stringWidth(text, self.font, size) > max_w:
            size -= 0.5
        return size

    def _wrap(self, text, size, max_w, min_size=6.5):
        """한 줄에 들어가면 그대로, 아니면 띄어쓰기 기준 두 줄로 나눈 뒤 크기를 맞춘다.
        돌려주는 값: [(글자, 크기), ...]"""
        one = self._fit(text, size, max_w, min_size=5)
        if one >= min_size or " " not in text and "·" not in text:
            return [(text, one)]
        sep = " " if " " in text else "·"
        words = text.split(sep)
        best = None
        for i in range(1, len(words)):
            a, b = sep.join(words[:i]), sep.join(words[i:])
            sz = min(self._fit(a, size, max_w, 5), self._fit(b, size, max_w, 5))
            if best is None or sz > best[0]:
                best = (sz, a, b)
        sz, a, b = best
        return [(a, sz), (b, sz)]

    def _page_start(self, key, title):
        self.c.bookmarkPage(key)
        self.dests.add(key)
        self.pages += 1
        self.dest_page[key] = self.pages
        c, W, H = self.c, self.W, self.H
        if self.has_bg and key != "cover":       # 표지는 cover() 에서 따로 칠함
            c.setFillColor(self.th["bg"]); c.rect(0, 0, W, H, stroke=0, fill=1)
        c.setFillColor(self.th["main"]); c.rect(0, H-50, W, 50, stroke=0, fill=1)
        if title:
            c.setFillColor(self.on_main)
            c.setFont(self.font, self._fit(title, 20, W - TAB_W - LEFT - 160))
            c.drawString(LEFT, H-33, title)
        self._tabs(key)

    def _link(self, x, y, w, h, dest):
        self.c.linkRect("", dest, (x, y, x+w, y+h), relative=0, thickness=0)
        self.links.append((self.pages, dest))

    def _arrow(self, x, y, size, color):
        """오른쪽 화살표(▶)를 도형으로 그린다. 글꼴에 ▸ 글자가 없어도 보이도록."""
        c = self.c
        c.setFillColor(color)
        p = c.beginPath()
        p.moveTo(x, y - size/2); p.lineTo(x + size*0.8, y); p.lineTo(x, y + size/2); p.close()
        c.drawPath(p, stroke=0, fill=1)

    def _back_to_month(self, y, m):
        """머리글 오른쪽 'n월 ▶' (해당 월간 페이지로 돌아가기)."""
        c, W, H = self.c, self.W, self.H
        text = self.L["months"][m-1]
        box_w = 150
        size = self._fit(text, 11, box_w - 20)
        right = W - TAB_W - LEFT
        c.setFillColor(self.on_main); c.setFont(self.font, size)
        c.drawRightString(right - 12, H-33, text)
        self._arrow(right - 7, H-29.5, 8, self.on_main)
        self._link(right - box_w, H-45, box_w, 40, month_key(y, m))

    def _header_chips(self, chips):
        """머리글 오른쪽의 작은 바로가기 버튼들 [(글자, 목적지)] — 오른쪽부터 채운다."""
        c, W, H = self.c, self.W, self.H
        x = W - TAB_W - LEFT
        for label, dest in reversed(chips):
            size = 10
            w = pdfmetrics.stringWidth(label, self.font, size) + 16
            x -= w
            c.setStrokeColor(self.on_main); c.setLineWidth(0.8)
            c.roundRect(x, H-37, w, 22, 6, stroke=1, fill=0)
            c.setFillColor(self.on_main); c.setFont(self.font, size)
            c.drawCentredString(x + w/2, H-29.5, label)
            self._link(x, H-40, w, 28, dest)
            x -= 6

    def _box(self, x, y, size):
        c = self.c
        c.setStrokeColor(self.ink); c.setLineWidth(0.6)
        c.rect(x, y, size, size, stroke=1, fill=0)

    def _month_chips(self, y, m):
        chips = []
        for kind in ("goals", "habits", "budget"):
            if kind in self.extras:
                chips.append((self.L["goals" if kind == "goals" else kind] if kind != "habits" else self.L["habit"],
                              f"{kind}_{y}_{m:02d}"))
        return chips

    def _tabs(self, current):
        c, W, H = self.c, self.W, self.H
        items = [(self.L["year_tab"], "year")]
        for i, (y, m) in enumerate(self.months):
            name = self.L["months_tab"][m-1]
            # 해를 넘기는 기간이면, 각 해의 첫 달 탭에 연도를 붙여 헷갈리지 않게
            if self.multi_year and (i == 0 or m == 1):
                name = f"{name}\n'{y % 100:02d}"
            items.append((name, month_key(y, m)))
        items.append((self.L["notes_tab"], "notes_1"))
        top, bottom = H-60, 20
        h = (top-bottom)/len(items)
        for i, (name, dest) in enumerate(items):
            y = top - (i+1)*h
            active = dest == current
            c.setFillColor(self.th["main"] if active else self.th["sub"])
            c.rect(W-TAB_W, y+1, TAB_W-4, h-2, stroke=0, fill=1)
            c.setFillColor(self.on_main if active else self.th["text"])
            lines = name.split("\n")
            # 줄 수와 탭 높이에 맞춰 글자 크기 결정
            size = min([self._fit(ln, 9, TAB_W-8) for ln in lines] + [max(5, (h - 4) / len(lines) - 1)])
            c.setFont(self.font, size)
            step = size + 1
            y0 = y + h/2 - size*0.35 + (len(lines)-1) * step / 2
            for k, ln in enumerate(lines):
                c.drawCentredString(W-TAB_W/2-2, y0 - k*step, ln)
            self._link(W-TAB_W, y, TAB_W, h, dest)

    # ---- 페이지들 ----
    def cover(self):
        c, W, H = self.c, self.W, self.H
        if self.has_bg:
            c.setFillColor(self.th["bg"]); c.rect(0, 0, W, H, stroke=0, fill=1)
        # 배경을 먼저 칠해야 오른쪽 탭이 가려지지 않는다
        c.setFillColor(self.th["sub"]); c.rect(0, 0, W-TAB_W, H-50, stroke=0, fill=1)
        self._page_start("cover", "")
        cx, max_w = (W-TAB_W)/2, W-TAB_W-LEFT*2
        k = 1.3 if self.cfg.font_family == "pen" else 1.0   # 손글씨 펜은 글자가 작게 생겨서 표지만 키운다
        lines = [(self.period_label(), 54 * k, self.ink),
                 (self.cfg.title or self.L["cover"], 26 * k, self.ink)]
        if self.cfg.motto:
            lines.append((self.cfg.motto, 14 * k, self.th["text"]))
        # 가운데 정렬: 줄 높이를 합쳐 세로 가운데에 놓는다
        gaps = [s * 1.5 for _, s, _ in lines]
        total = sum(gaps)
        y = H/2 + total/2 - gaps[0] * 0.75
        for (text, size, color), gap in zip(lines, gaps):
            c.setFillColor(color); c.setFont(self.font, self._fit(text, size, max_w))
            c.drawCentredString(cx, y, text)
            y -= gap
        if self.cfg.owner:                         # 이름: 아래쪽에 밑줄과 함께
            c.setFillColor(self.th["text"]); c.setFont(self.font, self._fit(self.cfg.owner, 16 * k, max_w/2))
            c.drawCentredString(cx, 80, self.cfg.owner)
            c.setStrokeColor(self.ink); c.setLineWidth(0.8)
            c.line(cx - 90, 72, cx + 90, 72)
        c.showPage()

    def yearly(self):
        c, H = self.c, self.H
        self._page_start("year", f"{self.period_label()} {self.L['year']}")
        chips = []
        if "goals" in self.extras: chips.append((self.L["goals"], "year_goals"))
        if "reading" in self.extras: chips.append((self.L["reading"], "reading_1"))
        if chips: self._header_chips(chips)
        n = len(self.months)
        if self.portrait:
            cols = 3 if n > 4 else 2 if n > 1 else 1
        else:
            cols = 6 if n > 12 else 4 if n > 6 else 3 if n > 2 else n
        rows = -(-n // cols)
        bw, bh = self.content_w/cols, (H-110)/rows
        names = self._dow(short=True)
        line = min(11, (bh - 34) / 6)
        for i, (yy, m) in enumerate(self.months):
            r, k = divmod(i, cols)
            x = LEFT + k*bw
            y = H-70 - (r+1)*bh
            c.setFillColor(self.ink); c.setFont(self.font, 11)
            head = self.L["months_short"][m-1]
            if self.multi_year:
                head = f"{yy}. {head}" if self.cfg.lang != "en" else f"{head} {yy}"
            c.drawString(x+4, y+bh-14, head)
            self._link(x, y+bh-20, bw-8, 20, month_key(yy, m))
            c.setFont(self.font, 6)
            cw = (bw-12)/7
            for j, nm in enumerate(names):
                c.setFillColor(self._col_color(j) or self.th["text"])
                c.drawCentredString(x+4+cw*j+cw/2, y+bh-28, nm)
            for wi, week in enumerate(month_grid(yy, m, self.cfg.week_start)):
                for di, d in enumerate(week):
                    if d:
                        dt = date(yy, m, d)
                        c.setFillColor(self._day_color(dt, self.th["text"]))
                        c.drawCentredString(x+4+cw*di+cw/2, y+bh-40-wi*line, str(d))
                        if self.cfg.include_daily and self.full_links:
                            self._link(x+4+cw*di, y+bh-43-wi*line, cw, line-1, day_key(dt))
        c.showPage()

    def monthly(self, yy, m):
        c, H = self.c, self.H
        key = month_key(yy, m)
        self._page_start(key, f"{yy} {self.L['months'][m-1]}")
        chips = self._month_chips(yy, m)
        if chips: self._header_chips(chips)
        names = self._dow()
        grid = month_grid(yy, m, self.cfg.week_start)
        cw = self.content_w/7
        top = H-70
        rh = (top-30)/6
        for i, n in enumerate(names):
            c.setFillColor(self.th["sub"]); c.rect(LEFT+i*cw, top-18, cw, 18, stroke=0, fill=1)
            c.setFillColor(self._col_color(i) or self.th["text"]); c.setFont(self.font, self._fit(n, 10, cw-4))
            c.drawCentredString(LEFT+i*cw+cw/2, top-13, n)
        c.setStrokeColor(self.ink); c.setLineWidth(0.4)
        for r, week in enumerate(grid):
            y = top-18-(r+1)*rh
            for i, d in enumerate(week):
                x = LEFT+i*cw
                c.rect(x, y, cw, rh, stroke=1, fill=0)
                if d:
                    dt = date(yy, m, d)
                    c.setFillColor(self._day_color(dt, self.ink)); c.setFont(self.font, 11)
                    c.drawString(x+5, y+rh-15, str(d))
                    name = self.hol.get(dt)
                    if name:   # 공휴일 이름: 날짜 아래, 길면 두 줄로 (너무 작아지지 않게)
                        for k, ln in enumerate(self._wrap(name, 8, cw - 8)):
                            c.setFont(self.font, ln[1])
                            c.drawString(x+5, y+rh-26-k*(ln[1]+1.5), ln[0])
                    if self.cfg.include_daily and self.full_links:
                        self._link(x, y, cw, rh, day_key(dt))
            self._week_link(yy, m, week, y, rh)
        c.showPage()

    def _week_link(self, yy, m, week, y, rh):
        """월간 페이지 각 줄 왼쪽 여백의 '▶' : 그 주의 주간 페이지로 이동 (full + 주간 포함일 때)."""
        if not (self.full_links and self.week_starts):
            return
        i, d = next((i, d) for i, d in enumerate(week) if d)
        start = date(yy, m, d) - timedelta(days=i)
        if start not in self.week_starts:
            return
        c = self.c
        c.setFillColor(self.th["sub"]); c.roundRect(10, y+rh/2-14, 24, 28, 4, stroke=0, fill=1)
        self._arrow(19, y+rh/2, 9, self.ink)
        self._link(8, y+rh/2-16, 28, 32, week_key(start))

    def _clamp_month(self, d):
        """기간 밖 날짜면 기간의 첫 달·마지막 달로 맞춘다 (주간 페이지가 기간 경계에 걸칠 때)."""
        if d < self.start:
            return self.months[0]
        if d > self.end:
            return self.months[-1]
        return (d.year, d.month)

    def weekly(self, start):
        c, H = self.c, self.H
        end = start + timedelta(days=6)
        self._page_start(week_key(start), f"{self.L['weekly']} {start:%m/%d} - {end:%m/%d}")
        if self.full_links:
            self._back_to_month(*self._clamp_month(start + timedelta(days=3)))  # 주의 가운데 날 기준
        names = self._dow()
        bw = self.content_w/2
        bh = (H-100)/4
        c.setStrokeColor(self.ink); c.setLineWidth(0.4)
        for i in range(7):
            d = start + timedelta(days=i)
            col, row = divmod(i, 4)
            x, y = LEFT+col*bw, H-70-(row+1)*bh
            c.rect(x, y, bw-6, bh-6, stroke=1, fill=0)
            c.setFillColor(self._day_color(d, self.ink)); c.setFont(self.font, 11)
            head = f"{d:%m/%d} {names[i]}"
            c.drawString(x+6, y+bh-22, head)
            name = self.hol.get(d)
            if name:
                hw = pdfmetrics.stringWidth(head, self.font, 11) + 12
                c.setFont(self.font, self._fit(name, 9, bw - 18 - hw))
                c.drawString(x+hw, y+bh-22, name)
            if self.start <= d <= self.end and self.cfg.include_daily and self.full_links:
                self._link(x, y+bh-30, bw-6, 24, day_key(d))
        c.showPage()

    def daily(self, d):
        c, H = self.c, self.H
        names = self.L["dow_mon"]   # d.weekday(): 월=0
        title = f"{d:%Y.%m.%d} ({names[d.weekday()]})"
        if d in self.hol:
            title += f" {self.hol[d]}"
        self._page_start(day_key(d), title)
        self._back_to_month(d.year, d.month)
        layout = self.cfg.daily_layout
        c.setStrokeColor(self.ink); c.setLineWidth(0.4)
        if layout == "lined":                      # 줄노트: 한 장 전체 줄
            for j in range(int((H-90)/26)):
                y = H-80-j*26
                c.line(LEFT, y, LEFT + self.content_w, y)
        elif layout == "timetable":                # 시간표형: 왼쪽 06~23시, 오른쪽 할 일 + 메모
            hours = list(range(6, 24))
            left_w = self.content_w * 0.58
            rh = (H-100) / len(hours)
            c.setFont(self.font, 9)
            for i, hr in enumerate(hours):
                y = H-75-(i+1)*rh
                c.setFillColor(self.ink); c.drawRightString(LEFT+26, y+rh-11, f"{hr:02d}")
                c.line(LEFT+32, y, LEFT+left_w-10, y)
            c.line(LEFT+32, H-75, LEFT+32, H-75-len(hours)*rh)
            x2 = LEFT + left_w + 6
            right_w = self.content_w - left_w - 6
            c.setFillColor(self.ink); c.setFont(self.font, self._fit(self.L["todo"], 12, right_w))
            c.drawString(x2, H-78, self.L["todo"])
            rows = int((H-100) * 0.55 / 26)
            for j in range(rows):
                y = H-100-j*26
                self._box(x2, y+3, 9)
                c.line(x2+16, y, x2+right_w, y)
            my = H-100-rows*26 - 24
            c.setFont(self.font, self._fit(self.L["memo"], 12, right_w)); c.drawString(x2, my, self.L["memo"])
            c.setStrokeColor(self.th["sub"]); c.rect(x2, 30, right_w, my-38, stroke=1, fill=0)
        else:                                      # 일정 + 할 일 (기본)
            half = self.content_w/2
            rows = int((H-110)/30)
            for label, x in ((self.L["schedule"], LEFT), (self.L["todo"], LEFT+half)):
                c.setFillColor(self.ink); c.setFont(self.font, self._fit(label, 12, half-12))
                c.drawString(x+6, H-78, label)
                for j in range(rows):
                    y = H-95-j*30
                    c.line(x+6, y, x+half-12, y)
        c.showPage()

    def notes(self, n):
        c, W, H = self.c, self.W, self.H
        self._page_start(f"notes_{n}", f"{self.L['notes']} {n}")
        x0, x1, y0, y1 = LEFT, W-TAB_W-LEFT, 30, H-65
        style = self.cfg.note_style
        c.setStrokeColor(self.th["sub"]); c.setFillColor(self.th["sub"]); c.setLineWidth(0.3)
        if style == "grid":
            for gx in range(int(x0), int(x1), 24):
                c.line(gx, y0, gx, y1)
            for gy in range(y0, int(y1), 24):
                c.line(x0, gy, x1, gy)
        elif style == "lined":
            c.setLineWidth(0.5)
            for gy in range(y0, int(y1), 26):
                c.line(x0, gy, x1, gy)
        elif style == "dot":
            c.setFillColor(self.ink)         # 연한 보조색은 점이 안 보여서 본색으로
            for gx in range(int(x0), int(x1)+1, 18):
                for gy in range(y0, int(y1)+1, 18):
                    c.circle(gx, gy, 0.8, stroke=0, fill=1)
        # blank: 아무것도 그리지 않음
        c.showPage()

    # ---- 추가 페이지 (8단계) ----
    def year_goals(self):
        c, H = self.c, self.H
        self._page_start("year_goals", f"{self.period_label()} {self.L['year_goals']}")
        rows = 8
        rh = (H-110)/rows
        c.setStrokeColor(self.ink); c.setLineWidth(0.4)
        for i in range(rows):
            y = H-75-(i+1)*rh
            c.setFillColor(self.th["sub"]); c.circle(LEFT+11, y+rh/2+2, 10, stroke=0, fill=1)
            c.setFillColor(self.ink); c.setFont(self.font, 10); c.drawCentredString(LEFT+11, y+rh/2-1.5, str(i+1))
            c.line(LEFT+30, y+rh/2-6, LEFT+self.content_w-60, y+rh/2-6)
            c.line(LEFT+30, y+6, LEFT+self.content_w-60, y+6)
            self._box(LEFT+self.content_w-40, y+rh/2-6, 14)
        c.setFont(self.font, 9); c.setFillColor(self.th["text"])
        c.drawCentredString(LEFT+self.content_w-33, H-70, self.L["progress"])
        c.showPage()

    def reading(self, n):
        c, H = self.c, self.H
        self._page_start(f"reading_{n}", f"{self.L['reading']} {n}")
        cols = [("#", .06), (self.L["title"], .40), (self.L["author"], .22), (self.L["read_date"], .14), (self.L["rating"], .18)]
        self._table(cols, H-70, 26, 30, start_no=n-1)   # 2쪽은 1쪽 다음 번호부터
        c.showPage()

    def _table(self, cols, top, head_h, row_h, start_no=None, bottom=30, numbered=True):
        """머리줄 + 빈 줄 표. cols=[(이름, 폭비율)]. 줄 수는 남은 높이에 맞춘다. 돌려주는 값: 줄 수"""
        c = self.c
        x0 = LEFT
        xs = [x0]
        for _, r in cols:
            xs.append(xs[-1] + self.content_w * r)
        c.setFillColor(self.th["sub"]); c.rect(x0, top-head_h, self.content_w, head_h, stroke=0, fill=1)
        c.setFillColor(self.th["text"])
        for (name, _), xa, xb in zip(cols, xs, xs[1:]):
            c.setFont(self.font, self._fit(name, 10, xb-xa-6)); c.drawCentredString((xa+xb)/2, top-head_h+8, name)
        rows = int((top-head_h-bottom)/row_h)
        c.setStrokeColor(self.ink); c.setLineWidth(0.4)
        yb = top-head_h-rows*row_h
        for j in range(rows+1):
            c.line(x0, top-head_h-j*row_h, xs[-1], top-head_h-j*row_h)
        for xv in xs:
            c.line(xv, top, xv, yb)
        if numbered and start_no is not None:
            c.setFont(self.font, 8); c.setFillColor(self.th["text"])
            for j in range(rows):
                c.drawCentredString((xs[0]+xs[1])/2, top-head_h-(j+1)*row_h+row_h/2-3, str(start_no*rows + j+1))
        return rows

    def month_goals(self, yy, m):
        c, H = self.c, self.H
        self._page_start(f"goals_{yy}_{m:02d}", f"{yy} {self.L['months'][m-1]} {self.L['month_goals']}")
        self._back_to_month(yy, m)
        c.setStrokeColor(self.ink); c.setLineWidth(0.4)
        c.setFillColor(self.ink); c.setFont(self.font, 12); c.drawString(LEFT, H-80, self.L["goals"])
        rows = 6
        for i in range(rows):
            y = H-100-i*26
            self._box(LEFT, y+3, 11)
            c.line(LEFT+20, y, LEFT+self.content_w, y)
        top = H-100-rows*26-24
        labels = [self.L["good"], self.L["improve"], self.L["next"]]
        if self.portrait:                          # 세로형: 세 칸을 위아래로
            bh = (top-30)/3
            for i, lb in enumerate(labels):
                y = top-(i+1)*bh
                c.setStrokeColor(self.th["sub"]); c.rect(LEFT, y+6, self.content_w, bh-6, stroke=1, fill=0)
                c.setFillColor(self.ink); c.setFont(self.font, 11); c.drawString(LEFT+8, y+bh-14, lb)
        else:                                      # 가로형: 세 칸을 옆으로
            bw = self.content_w/3
            for i, lb in enumerate(labels):
                x = LEFT+i*bw
                c.setStrokeColor(self.th["sub"]); c.rect(x, 30, bw-8, top-30, stroke=1, fill=0)
                c.setFillColor(self.ink); c.setFont(self.font, self._fit(lb, 11, bw-24)); c.drawString(x+8, top-16, lb)
        c.showPage()

    def habits(self, yy, m):
        import calendar as _cal
        c, H = self.c, self.H
        self._page_start(f"habits_{yy}_{m:02d}", f"{yy} {self.L['months'][m-1]} {self.L['habits']}")
        self._back_to_month(yy, m)
        days = _cal.monthrange(yy, m)[1]
        name_w = self.content_w * (0.26 if self.portrait else 0.2)
        cw = (self.content_w - name_w) / days
        top = H-75
        head = 30
        rh = 26                                     # 줄 높이 고정, 줄 수는 쪽 높이에 맞춤 (세로형은 더 많이)
        rows = int((top-head-30)/rh)
        c.setFillColor(self.th["sub"]); c.rect(LEFT, top-head, self.content_w, head, stroke=0, fill=1)
        c.setFillColor(self.th["text"]); c.setFont(self.font, 10)
        c.drawString(LEFT+6, top-head+11, self.L["habit"])
        dshort = self.L["dow_mon_short"]
        fs = max(5.5, min(8, cw*0.55))
        for d in range(1, days+1):
            dt = date(yy, m, d)
            x = LEFT+name_w+(d-1)*cw
            c.setFillColor(self._day_color(dt, self.th["text"]))
            c.setFont(self.font, fs); c.drawCentredString(x+cw/2, top-13, str(d))
            c.setFont(self.font, max(5, fs-1.5)); c.drawCentredString(x+cw/2, top-25, dshort[dt.weekday()])
        c.setStrokeColor(self.ink); c.setLineWidth(0.3)
        yb = top-head-rows*rh
        for j in range(rows+1):
            c.line(LEFT, top-head-j*rh, LEFT+self.content_w, top-head-j*rh)
        c.line(LEFT, top, LEFT, yb); c.line(LEFT+name_w, top, LEFT+name_w, yb)
        for d in range(days+1):
            x = LEFT+name_w+d*cw
            c.line(x, top-head, x, yb)
        c.showPage()

    def budget(self, yy, m):
        c, H = self.c, self.H
        self._page_start(f"budget_{yy}_{m:02d}", f"{yy} {self.L['months'][m-1]} {self.L['budget']}")
        self._back_to_month(yy, m)
        # 위: 합계 세 칸
        bw = self.content_w/3
        for i, lb in enumerate([self.L["total_income"], self.L["total_expense"], self.L["balance"]]):
            x = LEFT+i*bw
            c.setStrokeColor(self.ink); c.setLineWidth(0.5); c.rect(x, H-120, bw-8, 44, stroke=1, fill=0)
            c.setFillColor(self.ink); c.setFont(self.font, self._fit(lb, 10, bw-24)); c.drawString(x+8, H-90, lb)
        cols = [(self.L["date"], .13), (self.L["item"], .47), (self.L["income"], .20), (self.L["expense"], .20)]
        self._table(cols, H-132, 24, 24, start_no=None, numbered=False)
        c.showPage()

    def build(self):
        cfg = self.cfg
        self.cover(); self.yearly()
        if "goals" in self.extras: self.year_goals()
        if "reading" in self.extras:
            for n in (1, 2): self.reading(n)
        for yy, m in self.months:
            self.monthly(yy, m)
            # 그 달 바로 뒤에: 목표·돌아보기 → 습관 → 가계부 (굿노트에서 넘겨 보기 편하게)
            if "goals" in self.extras: self.month_goals(yy, m)
            if "habits" in self.extras: self.habits(yy, m)
            if "budget" in self.extras: self.budget(yy, m)
        for s in self.weeks: self.weekly(s)
        if cfg.include_daily:
            for d in days_between(self.start, self.end): self.daily(d)
        for n in range(1, max(cfg.note_pages, 1)+1): self.notes(n)
        self.c.save()
        return {"pages": self.pages, "links": len(self.links),
                "dests": self.dests, "dest_page": self.dest_page,
                "link_list": self.links}


def generate(cfg: PlannerConfig, out_path):
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    return Planner(cfg, out_path).build()
