"""날짜 계산: 달력 주 배열, 주 목록."""
import calendar
from datetime import date, timedelta


def month_grid(year, month, week_start):
    """해당 월의 주별 날짜 리스트(없는 칸은 None)."""
    first = 0 if week_start == "monday" else 6  # calendar.MONDAY=0, SUNDAY=6
    cal = calendar.Calendar(firstweekday=first)
    return [[d if d != 0 else None for d in w] for w in cal.monthdayscalendar(year, month)]


def period_months(year, start_month=1, months=12):
    """기간에 들어가는 (연, 월) 목록. 예: 2027년 11월부터 3개월 → [(2027,11),(2027,12),(2028,1)]"""
    out = []
    y, m = year, start_month
    for _ in range(months):
        out.append((y, m))
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return out


def period_range(year, start_month=1, months=12):
    """기간의 첫날과 마지막 날."""
    ms = period_months(year, start_month, months)
    ly, lm = ms[-1]
    return date(ms[0][0], ms[0][1], 1), date(ly, lm, calendar.monthrange(ly, lm)[1])


def week_start_of(d, week_start):
    back = d.weekday() if week_start == "monday" else (d.weekday() + 1) % 7
    return d - timedelta(days=back)


def weeks_between(start, end, week_start):
    """start 가 든 주부터 end 가 든 주까지 (주 시작일 리스트)."""
    d = week_start_of(start, week_start)
    out = []
    while d <= end:
        out.append(d)
        d += timedelta(days=7)
    return out


def days_between(start, end):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def weeks_of_year(year, week_start):
    """해당 연도 1/1이 포함된 주부터 12/31이 포함된 주까지 (시작일 리스트)."""
    return weeks_between(date(year, 1, 1), date(year, 12, 31), week_start)


def days_of_year(year):
    return days_between(date(year, 1, 1), date(year, 12, 31))


def day_key(d): return f"day_{d.isoformat()}"
def week_key(start): return f"week_{start.isoformat()}"
def month_key(y, m): return f"month_{y}_{m:02d}"
