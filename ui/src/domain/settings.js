// 플래너 설정의 기본값·고를 수 있는 값·검사 규칙.
// 기준은 엔진(engine/config.py)이다. 다른 점은 하나: 노트는 1~50만 받는다(사용자 결정).

export const DEFAULTS = Object.freeze({
  year: 2027, weekStart: 'monday', lang: 'ko', theme: 'navy',
  paper: 'tablet-landscape', linkScope: 'full', weekly: true, daily: true, notes: 5,
  startMonth: 1, months: 12, holidays: true,
  extras: [], dailyLayout: 'plan-todo', noteStyle: 'grid',
})

export const LIMITS = Object.freeze({
  year: { min: 2000, max: 2100 }, notes: { min: 1, max: 50 }, months: { min: 1, max: 18 },
})

export const OPTIONS = Object.freeze({
  weekStart: [{ value: 'monday', label: '월요일' }, { value: 'sunday', label: '일요일' }],
  lang: [{ value: 'ko', label: '한국어' }, { value: 'en', label: 'English' }, { value: 'ko-en', label: '한국어 + English' }],
  paper: [
    { value: 'tablet-landscape', label: '태블릿 가로형' },
    { value: 'goodnotes-portrait', label: '굿노트 세로형' },
    { value: 'a4-portrait', label: 'A4 인쇄형' },
  ],
  linkScope: [{ value: 'full', label: '전체 연결' }, { value: 'monthly', label: '월간 이동만' }],
  theme: [{ value: 'navy' }, { value: 'sage' }, { value: 'rose' }, { value: 'mono' }],
  startMonth: Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}월` })),
  extras: [
    { value: 'goals', label: '목표', desc: '연간 목표 1쪽 + 달마다 목표·돌아보기' },
    { value: 'habits', label: '습관 트래커', desc: '달마다 1쪽, 1~31일 체크 칸' },
    { value: 'reading', label: '독서 기록', desc: '제목·저자·별점 목록 2쪽' },
    { value: 'budget', label: '가계부', desc: '달마다 1쪽, 수입·지출 표' },
  ],
  dailyLayout: [
    { value: 'plan-todo', label: '일정 + 할 일' }, { value: 'timetable', label: '시간표형' }, { value: 'lined', label: '줄노트' },
  ],
  noteStyle: [
    { value: 'grid', label: '모눈' }, { value: 'lined', label: '줄' }, { value: 'dot', label: '점' }, { value: 'blank', label: '빈 종이' },
  ],
})

export const labelOf = (field, value) => (OPTIONS[field] || []).find((o) => o.value === value)?.label ?? String(value)

const isInt = (v) => typeof v === 'number' && Number.isInteger(v)

// 잘못된 칸만 { 칸이름: '고칠 방법' } 으로 돌려준다. 빈 객체면 통과.
export function validate(s) {
  const e = {}
  if (!isInt(s.year) || s.year < LIMITS.year.min || s.year > LIMITS.year.max) e.year = '2000~2100 사이 정수로 입력해 주세요'
  if (!isInt(s.startMonth) || s.startMonth < 1 || s.startMonth > 12) e.startMonth = '1~12월 중에서 골라 주세요'
  if (!isInt(s.months) || s.months < LIMITS.months.min || s.months > LIMITS.months.max) e.months = '1~18개월 사이 정수로 입력해 주세요'
  if (typeof s.holidays !== 'boolean') e.holidays = '켜기/끄기로 골라 주세요'
  if (!Array.isArray(s.extras) || s.extras.some((x) => !OPTIONS.extras.some((o) => o.value === x))) e.extras = '목록에서 골라 주세요'
  for (const f of ['weekStart', 'lang', 'paper', 'linkScope', 'theme', 'dailyLayout', 'noteStyle']) {
    if (!OPTIONS[f].some((o) => o.value === s[f])) e[f] = '목록에서 골라 주세요'
  }
  if (typeof s.weekly !== 'boolean') e.weekly = '켜기/끄기로 골라 주세요'
  if (typeof s.daily !== 'boolean') e.daily = '켜기/끄기로 골라 주세요'
  if (!isInt(s.notes) || s.notes < LIMITS.notes.min || s.notes > LIMITS.notes.max) e.notes = '1~50 사이 정수로 입력해 주세요'
  return e
}

const DAY = 86400000

// 기간: year 년 startMonth 월부터 months 개월 → 첫날·마지막 날 (엔진 calendar_utils.period_range 와 같음)
export function periodRange(year, startMonth = 1, months = 12) {
  const start = Date.UTC(year, startMonth - 1, 1)
  const end = Date.UTC(year, startMonth - 1 + months, 0) // 다음 달 0일 = 이번 달 마지막 날
  return { start, end }
}

// 엔진 weeks_between 과 같은 계산: 첫날이 든 주 ~ 마지막 날이 든 주
export function weeksBetween(start, end, weekStart) {
  const dow = new Date(start).getUTCDay() // 일=0
  const back = weekStart === 'monday' ? (dow + 6) % 7 : dow
  return Math.floor((end - (start - back * DAY)) / DAY / 7) + 1
}

export const daysBetween = (start, end) => Math.round((end - start) / DAY) + 1

export function weekCount(year, weekStart) {
  const { start, end } = periodRange(year, 1, 12)
  return weeksBetween(start, end, weekStart)
}

export const dayCount = (year) => ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365)

// 화면 표시용 '2027.01 ~ 2027.12'
export function periodLabel(s) {
  const { start, end } = periodRange(s.year, s.startMonth, s.months)
  const f = (t) => { const d = new Date(t); return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}` }
  return `${f(start)} ~ ${f(end)}`
}

// 엔진 build() 와 같은 순서: 표지 1 + 연간 1 + 월간(개월 수) + 주간 + 일간 + 노트
// 설정이 잘못됐으면 null (확정할 수 없는 값을 보여 주지 않기 위함)
export function estimatePages(s) {
  if (Object.keys(validate(s)).length) return null
  const { start, end } = periodRange(s.year, s.startMonth, s.months)
  const ex = new Set(s.extras)
  const extraPages = (ex.has('goals') ? 1 + s.months : 0) + (ex.has('reading') ? 2 : 0) +
    (ex.has('habits') ? s.months : 0) + (ex.has('budget') ? s.months : 0)
  return 2 + s.months + extraPages + (s.weekly ? weeksBetween(start, end, s.weekStart) : 0) + (s.daily ? daysBetween(start, end) : 0) + s.notes
}

// 저장돼 있던 값이 깨져 있어도 화면이 죽지 않게: 알려진 칸만 가져오고 나머지는 기본값
export function sanitize(raw) {
  const out = { ...DEFAULTS }
  if (raw && typeof raw === 'object') for (const k of Object.keys(DEFAULTS)) if (k in raw) out[k] = raw[k]
  const e = validate(out)
  for (const k of Object.keys(e)) out[k] = DEFAULTS[k]
  return out
}
