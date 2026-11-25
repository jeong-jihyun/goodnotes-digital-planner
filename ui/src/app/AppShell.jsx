import React from 'react'
import { ROUTES } from './routes.js'
import { href } from '../hooks/useHashRoute.js'
import { useSidebar } from '../hooks/useSidebar.js'
import Logo, { Brand } from '../components/Logo.jsx'

// 전체 틀: PC·태블릿은 왼쪽 메뉴(접기/펼치기), 폰(740px 이하)은 아래 탭.
export default function AppShell({ current, statusText, children }) {
  const { collapsed, toggle } = useSidebar()
  return (
    <>
      <div className={`app${collapsed ? ' collapsed' : ''}`}>
        <aside className="side" aria-label="주 메뉴">
          <div className="side-head">
            <a className="brand" href={href('dashboard')} aria-label="Planner Studio 홈">
              <span className="brand-full"><Brand size={30} /></span>
              <span className="brand-mini"><Logo size={32} /></span>
            </a>
            <button type="button" className="side-toggle" onClick={toggle}
              aria-expanded={!collapsed} aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
              title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}>
              <span aria-hidden="true">{collapsed ? '»' : '«'}</span>
            </button>
          </div>
          <nav className="nav">
            {ROUTES.map((r) => (
              <a key={r.path} href={href(r.path)} className={current === r.path ? 'active' : ''}
                aria-current={current === r.path ? 'page' : undefined}
                title={collapsed ? r.label : undefined}>
                <span className="ico" aria-hidden="true">{r.icon}</span>
                <span className="nav-label">{r.label}</span>
              </a>
            ))}
          </nav>
          <p className="tiny side-foot">© {new Date().getFullYear()} Planner Studio</p>
        </aside>
        <main className="main">
          {/* 폰에서는 왼쪽 메뉴가 없으므로 위에 로고를 보여 준다 */}
          <div className="top">
            <a className="top-brand" href={href('dashboard')} aria-label="Planner Studio 홈"><Brand size={30} /></a>
            {statusText && <span className="status" role="status">● {statusText}</span>}
          </div>
          {children}
        </main>
      </div>
      <nav className="mobile" aria-label="하단 메뉴">
        {ROUTES.map((r) => (
          <a key={r.path} href={href(r.path)} className={current === r.path ? 'active' : ''}
            aria-current={current === r.path ? 'page' : undefined}>
            <b aria-hidden="true">{r.icon}</b>{r.short}
          </a>
        ))}
      </nav>
    </>
  )
}
