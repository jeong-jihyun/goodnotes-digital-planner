// 6개 화면 목록 — 모바일 시안의 메뉴 이름·아이콘·순서를 그대로 쓴다.
export const ROUTES = [
  { path: 'dashboard', label: '홈 대시보드', short: '홈', icon: '⌂' },
  { path: 'create', label: '플래너 만들기', short: '플래너', icon: '＋' },
  { path: 'preview', label: '디자인 미리보기', short: '디자인', icon: '▧' },
  { path: 'generate', label: 'PDF 생성', short: 'PDF', icon: '⇩' },
  { path: 'listing', label: '상품 등록 관리', short: '상품', icon: '◇' },
  { path: 'settings', label: '설정 및 이력', short: '설정', icon: '⚙' },
]

export const DEFAULT_ROUTE = 'dashboard'

export const findRoute = (path) => ROUTES.find((r) => r.path === path) || ROUTES[0]
