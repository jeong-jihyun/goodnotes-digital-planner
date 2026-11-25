// 실행: npm test  (Node 내장 테스트, 추가 설치 없음)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULTS, OPTIONS, validate, estimatePages, weekCount, dayCount, sanitize, periodLabel } from './settings.js'

test('기본값은 통과', () => assert.deepEqual(validate(DEFAULTS), {}))

test('연도 경계', () => {
  for (const y of [2000, 2027, 2100]) assert.equal(validate({ ...DEFAULTS, year: y }).year, undefined)
  for (const y of [1999, 2101, 2027.5, NaN, '2027']) assert.ok(validate({ ...DEFAULTS, year: y }).year, String(y))
})

test('노트 1~50 (0은 거부)', () => {
  for (const n of [1, 50]) assert.equal(validate({ ...DEFAULTS, notes: n }).notes, undefined)
  for (const n of [0, 51, -1, 2.5, NaN]) assert.ok(validate({ ...DEFAULTS, notes: n }).notes, String(n))
})

test('목록 밖 값 거부', () => {
  const e = validate({ ...DEFAULTS, lang: 'jp', paper: 'letter', linkScope: 'none', theme: 'x', weekStart: 'friday' })
  assert.deepEqual(Object.keys(e).sort(), ['lang', 'linkScope', 'paper', 'theme', 'weekStart'])
})

test('주 수·날 수 (엔진과 같은 값)', () => {
  assert.equal(weekCount(2027, 'monday'), 53)   // 2026-12-28 ~ 2027-12-27 시작 주
  assert.equal(weekCount(2028, 'sunday'), 54)   // 엔진 weeks_of_year 로 확인한 값
  assert.equal(dayCount(2028), 366); assert.equal(dayCount(2100), 365); assert.equal(dayCount(2000), 366)
})

test('예상 쪽수: 엔진 테스트와 같은 식', () => {
  // tests/test_planner.py: 2 + 12 + weeks(2028, sunday) + 366 + 5
  assert.equal(estimatePages({ ...DEFAULTS, year: 2028, weekStart: 'sunday' }), 2 + 12 + 54 + 366 + 5)
  assert.equal(estimatePages({ ...DEFAULTS, weekly: false, daily: false, notes: 1 }), 15)
  assert.equal(estimatePages({ ...DEFAULTS, notes: 0 }), null)
})

test('깨진 저장값 복구', () => {
  assert.deepEqual(sanitize(null), DEFAULTS)
  const s = sanitize({ year: 2030, notes: 999, lang: 'ko-en', hacked: 1 })
  assert.equal(s.year, 2030); assert.equal(s.notes, 5); assert.equal(s.lang, 'ko-en'); assert.equal(s.hacked, undefined)
})

test('기간 검사', () => {
  for (const [k, v] of [['startMonth', 0], ['startMonth', 13], ['months', 0], ['months', 19], ['months', 1.5], ['holidays', 'yes']])
    assert.ok(validate({ ...DEFAULTS, [k]: v })[k], `${k}=${v}`)
  assert.deepEqual(validate({ ...DEFAULTS, startMonth: 7, months: 18 }), {})
})

test('기간 표시', () => {
  assert.equal(periodLabel(DEFAULTS), '2027.01 ~ 2027.12')
  assert.equal(periodLabel({ ...DEFAULTS, startMonth: 11, months: 3 }), '2027.11 ~ 2028.01')
})

test('기간 쪽수: 엔진 테스트와 같은 값', () => {
  // tests/test_period_holidays.py: 2027-11 부터 3개월, 노트 1 → 2 + 3 + 주 수 + 92 + 1
  const p = estimatePages({ ...DEFAULTS, startMonth: 11, months: 3, notes: 1 })
  assert.equal(p, 2 + 3 + 14 + 92 + 1)
})

test('추가 페이지·속지 검사', () => {
  assert.deepEqual(validate({ ...DEFAULTS, extras: ['goals', 'budget'], dailyLayout: 'timetable', noteStyle: 'dot' }), {})
  assert.ok(validate({ ...DEFAULTS, extras: ['diary'] }).extras)
  assert.ok(validate({ ...DEFAULTS, extras: 'goals' }).extras)
  assert.ok(validate({ ...DEFAULTS, dailyLayout: 'hourly' }).dailyLayout)
  assert.ok(validate({ ...DEFAULTS, noteStyle: 'music' }).noteStyle)
})

test('추가 페이지 쪽수: 엔진 테스트와 같은 식', () => {
  // tests/test_extras.py: 연간 목표 1 + 독서 2 + (월 목표·습관·가계부) × 12
  const base = estimatePages({ ...DEFAULTS, weekly: false, daily: false, notes: 1 })
  const all = estimatePages({ ...DEFAULTS, weekly: false, daily: false, notes: 1, extras: ['goals', 'habits', 'reading', 'budget'] })
  assert.equal(all - base, 1 + 2 + 3 * 12)
  // 서버 테스트: 2개월 + 가계부, 주간·일간 없음, 노트 1 → 2 + 2 + 2 + 1
  assert.equal(estimatePages({ ...DEFAULTS, months: 2, weekly: false, daily: false, notes: 1, extras: ['budget'] }), 7)
})

// ---------- 9단계: 꾸미기 ----------
import { mix, customSub, themeName, THEMES as T9 } from './themes.js'
import { toRequest } from '../services/plannerApi.js'

test('새 테마 4개와 직접 고르기가 선택지에 있다', () => {
  for (const id of ['pastel', 'dark', 'vintage', 'terracotta', 'custom']) assert.ok(OPTIONS.theme.some((o) => o.value === id), id)
  assert.equal(T9.length, 8)
})

test('직접 고른 색 검사: #RRGGBB 만 통과', () => {
  assert.equal(validate({ ...DEFAULTS, theme: 'custom', customColor: '#FFD54F' }).customColor, undefined)
  for (const bad of ['', 'red', '#12345', '#GGGGGG']) assert.ok(validate({ ...DEFAULTS, customColor: bad }).customColor, bad)
})

test('표지 글자 수는 이모지도 1자로 센다 (서버와 같게)', () => {
  assert.equal(validate({ ...DEFAULTS, owner: '😀'.repeat(30) }).owner, undefined)
  assert.ok(validate({ ...DEFAULTS, owner: '가'.repeat(31) }).owner)
  assert.ok(validate({ ...DEFAULTS, motto: 'a'.repeat(61) }).motto)
  assert.ok(validate({ ...DEFAULTS, title: 'a'.repeat(41) }).title)
})

test('보조색 계산이 엔진과 같다', () => {
  assert.equal(mix('#000000', '#FFFFFF', 0.5), '#808080')
  assert.equal(customSub('#BF603D'), '#F6E9E4')
  assert.equal(themeName({ theme: 'custom', customColor: '#112233' }), '직접 고른 색 #112233')
})

test('요청에는 앞뒤 빈칸을 지운 표지 글과 대문자 색이 들어간다', () => {
  const r = toRequest({ ...DEFAULTS, title: '  나의 플래너 ', customColor: '#abcdef', theme: 'custom' })
  assert.equal(r.title, '나의 플래너'); assert.equal(r.customColor, '#ABCDEF'); assert.equal(r.fontFamily, 'gothic')
})

test('예전에 저장된 설정(꾸미기 칸 없음)도 기본값으로 채워진다', () => {
  const s = sanitize({ year: 2028, theme: 'sage' })
  assert.equal(s.year, 2028); assert.equal(s.fontFamily, 'gothic'); assert.equal(s.owner, ''); assert.equal(s.customColor, '#6558D3')
})
