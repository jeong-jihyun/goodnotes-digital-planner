"""한국 공휴일 (무료 라이브러리 holidays 사용: 음력 설·추석, 대체공휴일, 선거일 포함).
미래 연도는 정부 발표(임시공휴일 등)에 따라 달라질 수 있다."""
from functools import lru_cache


@lru_cache(maxsize=8)
def kr_holidays(years: tuple, lang: str = "ko"):
    """{date: 이름}. lang 이 en 이면 영어 이름, 그 외(ko, ko-en)는 한국어 이름."""
    try:
        import holidays
    except ImportError:          # 라이브러리가 없으면 공휴일 없이 만든다(PDF 생성은 계속)
        return {}
    language = "en_US" if lang == "en" else "ko"
    try:
        h = holidays.KR(years=list(years), language=language)
    except Exception:
        h = holidays.KR(years=list(years))
    # 같은 날 두 공휴일이면 "개천절; 추석" → "개천절·추석"
    return {d: n.replace("; ", "·") for d, n in h.items()}
