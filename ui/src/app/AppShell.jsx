import React from 'react'
import { ROUTES } from './routes.js'
import { href } from '../hooks/useHashRoute.js'

// 전체 틀: PC는 왼쪽 메뉴, 폰(740px 이하)은 아래 탭.
export default function AppShell({ current, statusText, children }) {
  return (
    <>
      <div className="app">
        <aside className="side" aria-label="주 메뉴">
          <div className="brand">1 · 플래너 스튜디오<br /><small>PRJ-0001 WORKSPACE</small></div>
          <nav className="nav">
            {ROUTES.map((r) => (
              <a key={r.path} href={href(r.path)} className={current === r.path ? 'active' : ''}
                aria-current={current === r.path ? 'page' : undefined}>
                <span className="ico" aria-hidden="true">{r.icon}</span>{r.label}
              </a>
            ))}
          </nav>
          <p className="tiny side-foot">UI 개발 중 · 1단계<br />PDF 생성 엔진은 6단계에서 연결</p>
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
