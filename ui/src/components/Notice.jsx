import React from 'react'

// 안내 상자. tone: info(노랑, 기본) | error | success
// stage를 주면 "(N단계에서 연결 예정)"을 덧붙인다 — 아직 없는 기능을 숨기지 않기 위함.
export default function Notice({ tone = 'info', stage, children }) {
  return (
    <div className={`notice${tone !== 'info' ? ' ' + tone : ''}`} role={tone === 'error' ? 'alert' : undefined}>
      {children}{stage ? ` (${stage}단계에서 연결 예정)` : ''}
    </div>
  )
}
