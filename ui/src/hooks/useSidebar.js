import { useCallback, useEffect, useState } from 'react'

// 왼쪽 메뉴 접기/펼치기
// - 사용자가 한 번 누르면 그 상태를 이 기기에 기억한다(localStorage).
// - 누른 적이 없으면 화면 폭으로 정한다: PC(1024px 이상) 펼침, 태블릿(741~1023px) 접힘.
// - 폰(740px 이하)은 왼쪽 메뉴 대신 하단 탭을 쓰므로 이 값과 상관없다.
const KEY = 'gdp.sidebarCollapsed'
const TABLET = '(max-width: 1023px)'

function readSaved() {
  try {
    const v = localStorage.getItem(KEY)
    return v === null ? null : v === '1'
  } catch { return null }
}

export function useSidebar() {
  const [saved, setSaved] = useState(readSaved)
  const [isTablet, setIsTablet] = useState(() => window.matchMedia(TABLET).matches)

  useEffect(() => {
    const mq = window.matchMedia(TABLET)
    const onChange = (e) => setIsTablet(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const collapsed = saved === null ? isTablet : saved

  const toggle = useCallback(() => {
    const next = !collapsed
    setSaved(next)
    try { localStorage.setItem(KEY, next ? '1' : '0') } catch { /* 저장 안 돼도 화면은 동작 */ }
  }, [collapsed])

  return { collapsed, toggle }
}
