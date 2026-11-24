import React from 'react'

// 아직 연결되지 않은 기능을 숨기지 않고 "몇 단계에서 연결"인지 알려 준다.
export default function StageNotice({ stage, children }) {
  return <div className="notice">{children}{stage ? ` (${stage}단계에서 연결 예정)` : ''}</div>
}
