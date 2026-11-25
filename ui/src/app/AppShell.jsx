import React from 'react'
import { ROUTES } from './routes.js'
import { href } from '../hooks/useHashRoute.js'
import { useSidebar } from '../hooks/useSidebar.js'

// 전체 틀: PC·태블릿은 왼쪽 메뉴(접기/펼치기), 폰(740px 이하)은 아래 탭.
export default function AppShell({ current, statusText, children }) {
  const { collapsed, toggle } = useSidebar()
  return (
    <>
      <div className={`app${collapsed ? ' collapsed' : ''}`}>
        <aside className="side" aria-label="주 메뉴">
          <div className="side-head">
            <div className="brand">
              <span className="brand-full">1 · 플래너 스튜디오<br /><small>PRJ-0001 WORKSPACE</small></span>
              <span className="brand-mini" aria-hidden="true">1</span>
            </div>
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
          <p className="tiny side-foot">UI 개발 중 · 9단계<br />PDF 생성 서버 연결</p>
        </aside>
        <main className="main">
          <div className="top">
            <span>PRJ-0001 / WORKSPACE</span>
            <span className="status" role="status">● {statusText}</span>
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
