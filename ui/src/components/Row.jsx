import React from 'react'

// 카드 안의 한 줄(왼쪽 글, 오른쪽 상태·버튼)
export default function Row({ children, end }) {
  return <div className="row"><span className="row-main">{children}</span>{end}</div>
}
