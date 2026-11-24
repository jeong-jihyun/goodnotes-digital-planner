// 플래너 설정의 기본값·고를 수 있는 값·검사 규칙.
// 기준은 엔진(engine/config.py)이다. 다른 점은 하나: 노트는 1~50만 받는다(사용자 결정).

export const DEFAULTS = Object.freeze({
  year: 2027, weekStart: 'monday', lang: 'ko', theme: 'navy',
  paper: 'tablet-landscape', linkScope: 'full', weekly: true, daily: true, notes: 5,
})

export const LIMITS = Object.freeze({ year: { min: 2000, max: 2100 }, notes: { min: 1, max: 50 } })

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
})

export const labelOf = (field, value) => (OPTIONS[field] || []).find((o) => o.value === value)?.label ?? String(value)

const isInt = (v) => typeof v === 'number' && Number.isInteger(v)

// 잘못된 칸만 { 칸이름: '고칠 방법' } 으로 돌려준다. 빈 객체면 통과.
export function validate(s) {
  const e = {}
  if (!isInt(s.year) || s.year < LIMITS.year.min || s.year > LIMITS.year.max) e.year = '2000~2100 사이 정수로 입력해 주세요'
  for (const f of ['weekStart', 'lang', 'paper', 'linkScope', 'theme']) {
    if (!OPTIONS[f].some((o) => o.value === s[f])) e[f] = '목록에서 골라 주세요'
  }
  if (typeof s.weekly !== 'boolean') e.weekly = '켜기/끄기로 골라 주세요'
  if (typeof s.daily !== 'boolean') e.daily = '켜기/끄기로 골라 주세요'
  if (!isInt(s.notes) || s.notes < LIMITS.notes.min || s.notes > LIMITS.notes.max) e.notes = '1~50 사이 정수로 입력해 주세요'
  return e
}

// 엔진 calendar_utils.weeks_of_year 와 같은 계산: 1/1이 든 주 ~ 12/31이 든 주
export function weekCount(year, weekStart) {
  const jan1 = new Date(Date.UTC(year, 0, 1))
  const dow = jan1.getUTCDay() // 일=0
  const back = weekStart === 'monday' ? (dow + 6) % 7 : dow
  const start = Date.UTC(year, 0, 1 - back)
  const end = Date.UTC(year, 11, 31)
  return Math.floor((end - start) / 86400000 / 7) + 1
}

export const dayCount = (year) => ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365)

// 엔진 build() 와 같은 순서: 표지 1 + 연간 1 + 월간 12 + 주간 + 일간 + 노트
// 설정이 잘못됐으면 null (확정할 수 없는 값을 보여 주지 않기 위함)
export function estimatePages(s) {
  if (Object.keys(validate(s)).length) return null
  return 2 + 12 + (s.weekly ? weekCount(s.year, s.weekStart) : 0) + (s.daily ? dayCount(s.year) : 0) + s.notes
}

// 저장돼 있던 값이 깨져 있어도 화면이 죽지 않게: 알려진 칸만 가져오고 나머지는 기본값
export function sanitize(raw) {
  const out = { ...DEFAULTS }
  if (raw && typeof raw === 'object') for (const k of Object.keys(DEFAULTS)) if (k in raw) out[k] = raw[k]
  const e = validate(out)
  for (const k of Object.keys(e)) out[k] = DEFAULTS[k]
  return out
}
