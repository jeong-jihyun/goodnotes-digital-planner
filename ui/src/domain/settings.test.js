// 실행: npm test  (Node 내장 테스트, 추가 설치 없음)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULTS, validate, estimatePages, weekCount, dayCount, sanitize } from './settings.js'

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
