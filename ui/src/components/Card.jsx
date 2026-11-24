import React from 'react'

// 카드. size: third(기본, 1/3) | half | wide(2/3) | full | stat(숫자 카드)
// tabletFull: 태블릿에서 혼자 남지 않게 한 줄 전체로
const SIZE = { third: '', half: ' half', wide: ' wide', full: ' full', stat: ' stat' }

export default function Card({ size = 'third', tabletFull = false, title, children, as: Tag = 'div', ...rest }) {
  return (
    <Tag className={`card${SIZE[size] || ''}${tabletFull ? ' t-full' : ''}`} {...rest}>
      {title && <h3>{title}</h3>}
      {children}
    </Tag>
  )
}

export function Grid({ children }) {
  return <div className="grid">{children}</div>
}

export function Metric({ label, value, hint }) {
  return (
    <>
      <div className="tiny">{label}</div>
      <div className="metric">{value}</div>
      {hint && <div className="tiny">{hint}</div>}
    </>
  )
}
