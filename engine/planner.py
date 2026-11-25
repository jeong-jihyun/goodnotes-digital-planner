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

from .config import PlannerConfig, THEMES, PAPERS
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


def _font(cfg):
    """TTF를 PDF에 내장한다(보는 기기에 폰트가 없어도 한글이 보이도록)."""
    path = cfg.font_path if cfg.font_path and os.path.exists(cfg.font_path) else BUNDLED_FONT
    if os.path.exists(path):
        pdfmetrics.registerFont(TTFont("PlannerFont", path))
        return "PlannerFont"
    return "Helvetica"  # 영어 전용 대체 (한글 불가)


class Planner:
    def __init__(self, cfg: PlannerConfig, path):
        self.cfg = cfg.validate()
        self.L = LABELS[cfg.lang]
        self.th = {k: HexColor(v) for k, v in THEMES[cfg.theme].items()}
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
        self.weeks = weeks_between(self.start, self.end, cfg.week_start) if cfg.include_weekly else []
        self.week_starts = set(self.weeks)   # 월간→주간 링크는 실제로 있는 페이지로만

    # ---- 공통 ----
    def period_label(self):
        """기본 기간(1월부터 12개월)이면 '2027', 아니면 '2027.03 - 2028.02'."""
        if self.cfg.start_month == 1 and self.cfg.months == 12:
            return str(self.cfg.year)
        (y1, m1), (y2, m2) = self.months[0], self.months[-1]
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
        c.setFillColor(self.th["main"]); c.rect(0, H-50, W, 50, stroke=0, fill=1)
        if title:
            c.setFillColor(WHITE)
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
        c.setFillColor(WHITE); c.setFont(self.font, size)
        c.drawRightString(right - 12, H-33, text)
        self._arrow(right - 7, H-29.5, 8, WHITE)
        self._link(right - box_w, H-45, box_w, 40, month_key(y, m))

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
            c.setFillColor(WHITE if active else self.th["text"])
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
        # 배경을 먼저 칠해야 오른쪽 탭이 가려지지 않는다
        c.setFillColor(self.th["sub"]); c.rect(0, 0, W-TAB_W, H-50, stroke=0, fill=1)
        self._page_start("cover", "")
        c.setFillColor(self.th["main"])
        label = self.period_label()
        c.setFont(self.font, self._fit(label, 54, W-TAB_W-LEFT*2))
        c.drawCentredString((W-TAB_W)/2, H/2+20, label)
        title = self.cfg.title or self.L["cover"]
        c.setFont(self.font, self._fit(title, 26, W-TAB_W-LEFT*2))
        c.drawCentredString((W-TAB_W)/2, H/2-30, title)
        c.showPage()

    def yearly(self):
        c, H = self.c, self.H
        self._page_start("year", f"{self.period_label()} {self.L['year']}")
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
            c.setFillColor(self.th["main"]); c.setFont(self.font, 11)
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
        names = self._dow()
        grid = month_grid(yy, m, self.cfg.week_start)
        cw = self.content_w/7
        top = H-70
        rh = (top-30)/6
        for i, n in enumerate(names):
            c.setFillColor(self.th["sub"]); c.rect(LEFT+i*cw, top-18, cw, 18, stroke=0, fill=1)
            c.setFillColor(self._col_color(i) or self.th["text"]); c.setFont(self.font, self._fit(n, 10, cw-4))
            c.drawCentredString(LEFT+i*cw+cw/2, top-13, n)
        c.setStrokeColor(self.th["main"]); c.setLineWidth(0.4)
        for r, week in enumerate(grid):
            y = top-18-(r+1)*rh
            for i, d in enumerate(week):
                x = LEFT+i*cw
                c.rect(x, y, cw, rh, stroke=1, fill=0)
                if d:
                    dt = date(yy, m, d)
                    c.setFillColor(self._day_color(dt, self.th["main"])); c.setFont(self.font, 11)
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
        self._arrow(19, y+rh/2, 9, self.th["main"])
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
        c.setStrokeColor(self.th["main"]); c.setLineWidth(0.4)
        for i in range(7):
            d = start + timedelta(days=i)
            col, row = divmod(i, 4)
            x, y = LEFT+col*bw, H-70-(row+1)*bh
            c.rect(x, y, bw-6, bh-6, stroke=1, fill=0)
            c.setFillColor(self._day_color(d, self.th["main"])); c.setFont(self.font, 11)
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
        half = self.content_w/2
        rows = int((H-110)/30)
        c.setStrokeColor(self.th["main"]); c.setLineWidth(0.4)
        for label, x in ((self.L["schedule"], LEFT), (self.L["todo"], LEFT+half)):
            c.setFillColor(self.th["main"]); c.setFont(self.font, self._fit(label, 12, half-12))
            c.drawString(x+6, H-78, label)
            for j in range(rows):
                y = H-95-j*30
                c.line(x+6, y, x+half-12, y)
        c.showPage()

    def notes(self, n):
        c, W, H = self.c, self.W, self.H
        self._page_start(f"notes_{n}", f"{self.L['notes']} {n}")
        c.setStrokeColor(self.th["sub"]); c.setLineWidth(0.3)
        for gx in range(int(LEFT), int(W-TAB_W-LEFT), 24):
            c.line(gx, 30, gx, H-65)
        for gy in range(30, H-65, 24):
            c.line(LEFT, gy, W-TAB_W-LEFT, gy)
        c.showPage()

    def build(self):
        cfg = self.cfg
        self.cover(); self.yearly()
        for yy, m in self.months: self.monthly(yy, m)
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
