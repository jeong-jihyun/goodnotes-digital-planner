import React from 'react'

// 진행 막대. value(0~100)가 없으면 "진행률 모름" 상태로 움직이는 줄만 보여 준다
// (설계서: 실제 진행률이 없으면 임의 퍼센트를 표시하지 않는다).
export default function ProgressBar({ value, label }) {
  const known = typeof value === 'number'
  return (
    <div className={`progress${known ? '' : ' indeterminate'}`} role="progressbar" aria-label={label}
      aria-valuemin={known ? 0 : undefined} aria-valuemax={known ? 100 : undefined} aria-valuenow={known ? value : undefined}>
      <span style={known ? { width: `${value}%` } : undefined} />
    </div>
  )
}
