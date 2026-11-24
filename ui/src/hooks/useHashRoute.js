import { useEffect, useState } from 'react'
import { DEFAULT_ROUTE, findRoute } from '../app/routes.js'

// 주소 뒤 #/create 처럼 화면을 구분한다.
// 해시 방식이라 Vercel 정적 배포와 Electron(file://) 양쪽에서 새로고침해도 같은 화면이 열린다.
function read() {
  const raw = window.location.hash.replace(/^#\/?/, '') || DEFAULT_ROUTE
  return findRoute(raw).path
}

export function useHashRoute() {
  const [path, setPath] = useState(read)
  useEffect(() => {
    const onChange = () => { setPath(read()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return path
}

export const href = (path) => `#/${path}`
