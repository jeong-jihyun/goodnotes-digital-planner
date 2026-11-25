"""PDF에 들어가는 글자.
- months / dow_*       : 제목·월간 머리글처럼 자리가 넉넉한 곳
- months_tab           : 오른쪽 탭 (좁아서 두 줄까지, '\n'으로 줄바꿈)
- months_short / dow_*_short : 연간 페이지의 작은 달력 (칸이 좁아 한 언어만)
"""

_KO = {
    "months": [f"{i}월" for i in range(1, 13)],
    "dow_mon": ["월", "화", "수", "목", "금", "토", "일"],
    "dow_sun": ["일", "월", "화", "수", "목", "금", "토"],
    "year": "연간", "notes": "노트", "weekly": "주간", "daily": "일간",
    "cover": "디지털 플래너", "todo": "할 일", "memo": "메모", "week": "주",
    "schedule": "일정", "home": "홈",
    "goals": "목표", "year_goals": "연간 목표", "month_goals": "목표·돌아보기", "habits": "습관 트래커",
    "habit": "습관", "reading": "독서 기록", "budget": "가계부", "title": "제목", "author": "저자",
    "read_date": "읽은 날", "rating": "별점", "date": "날짜", "item": "내용", "income": "수입",
    "expense": "지출", "balance": "남은 돈", "total_income": "수입 합계", "total_expense": "지출 합계",
    "good": "잘한 점", "improve": "아쉬운 점", "next": "다음 달에는", "progress": "진행",
    "notes_short": "메모",
}
_EN_MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July",
                   "August", "September", "October", "November", "December"]
_EN = {
    "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "dow_mon": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "dow_sun": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    "year": "Year", "notes": "Notes", "weekly": "Weekly", "daily": "Daily",
    "cover": "Digital Planner", "todo": "To do", "memo": "Memo", "week": "Week",
    "schedule": "Schedule", "home": "Home",
    "goals": "Goals", "year_goals": "Yearly goals", "month_goals": "Goals & review", "habits": "Habit tracker",
    "habit": "Habit", "reading": "Reading log", "budget": "Budget", "title": "Title", "author": "Author",
    "read_date": "Date", "rating": "Rating", "date": "Date", "item": "Item", "income": "Income",
    "expense": "Expense", "balance": "Balance", "total_income": "Total income", "total_expense": "Total expense",
    "good": "Went well", "improve": "To improve", "next": "Next month", "progress": "Done",
    "notes_short": "Notes",
}


def _single(d):
    """한 언어: 탭·작은 달력도 같은 글자를 쓴다."""
    return {**d, "months_tab": d["months"], "months_short": d["months"],
            "dow_mon_short": d["dow_mon"], "dow_sun_short": d["dow_sun"],
            "year_tab": d["year"], "notes_tab": d["notes"]}


def _both(ko, en):
    """한국어+영어 나란히: '1월 January', '월 Mon'. 좁은 곳은 한글만 또는 두 줄."""
    joined = {k: f"{ko[k]} {en[k]}" for k in ko if isinstance(ko[k], str)}
    return {
        **joined,
        "months": [f"{k} {e}" for k, e in zip(ko["months"], _EN_MONTHS_LONG)],
        "dow_mon": [f"{k} {e}" for k, e in zip(ko["dow_mon"], en["dow_mon"])],
        "dow_sun": [f"{k} {e}" for k, e in zip(ko["dow_sun"], en["dow_sun"])],
        "months_tab": [f"{k}\n{e}" for k, e in zip(ko["months"], en["months"])],
        "months_short": ko["months"],
        "dow_mon_short": ko["dow_mon"], "dow_sun_short": ko["dow_sun"],
        "year_tab": f"{ko['year']}\n{en['year']}", "notes_tab": f"{ko['notes']}\n{en['notes']}",
    }


LABELS = {"ko": _single(_KO), "en": _single(_EN), "ko-en": _both(_KO, _EN)}
