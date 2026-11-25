// 플래너 PDF 테마 색 — engine/config.py 의 THEMES 와 같은 값 (엔진이 단일 기준)
// bg: 종이색(없으면 흰색). 다크·빈티지는 종이색이 따로 있다.
export const THEMES = [
  { id: 'navy', name: '네이비', main: '#1F3864', sub: '#DCE6F5' },
  { id: 'sage', name: '세이지', main: '#5B7F6A', sub: '#E3EEE7' },
  { id: 'rose', name: '로즈', main: '#B45A6E', sub: '#F7E3E8' },
  { id: 'mono', name: '모노', main: '#333333', sub: '#EEEEEE' },
  { id: 'pastel', name: '파스텔', main: '#8C7BC4', sub: '#ECE6F7' },
  { id: 'dark', name: '다크', main: '#8AB4F8', sub: '#2E3446', bg: '#1C2030' },
  { id: 'vintage', name: '빈티지', main: '#7A5C3E', sub: '#EEE2CC', bg: '#FBF6EA' },
  { id: 'terracotta', name: '테라코타', main: '#BF603D', sub: '#F6E1D6' },
]

export const CUSTOM_DEFAULT = '#6558D3'
export const isHex = (c) => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c)

// 엔진 _mix 와 같은 계산: 색 a 와 b 를 t 비율로 섞기
export function mix(a, b, t) {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0').toUpperCase()).join('')
}

// 메인색 하나 → 견본에 쓸 보조색 (엔진 custom_theme 과 같음)
export const customSub = (main) => mix(main, '#FFFFFF', 0.86)

export function themeName(s) {
  if (s.theme === 'custom') return `직접 고른 색 ${s.customColor}`
  return THEMES.find((t) => t.id === s.theme)?.name ?? s.theme
}

// 글꼴 — engine/config.py FONTS 와 같은 키. 모두 나눔 글꼴(상업 이용 가능)
export const FONTS = [
  { value: 'gothic', label: '나눔고딕', desc: '기본 · 깔끔하고 잘 읽혀요' },
  { value: 'myeongjo', label: '나눔명조', desc: '책처럼 차분한 느낌' },
  { value: 'barun', label: '나눔바른고딕', desc: '조금 더 단정한 고딕' },
  { value: 'squareround', label: '나눔스퀘어라운드', desc: '둥글고 귀여운 느낌' },
  { value: 'pen', label: '나눔손글씨 펜', desc: '손으로 쓴 느낌 · 글자가 조금 작아 보여요' },
]
