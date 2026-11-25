import React, { useId } from 'react'

// Planner Studio 로고: 보라 둥근 사각형 + 흰 P (public/logo.svg 와 같은 모양)
// 그라데이션 id 는 로고마다 달라야 한다. 같으면 숨겨진(display:none) 로고의 것을 가리켜 흰 상자로 보인다.
export default function Logo({ size = 32 }) {
  const gid = 'ps-g' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="logo">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7A6DE6" /><stop offset="1" stopColor="#5245C2" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${gid})`} />
      <path d="M17.5 35.5V12.5h8a7.75 7.75 0 0 1 0 15.5h-8" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="34.5" cy="35" r="3" fill="#C9C2FF" />
    </svg>
  )
}

export function Brand({ size = 32 }) {
  return (
    <span className="brand-lockup">
      <Logo size={size} />
      <span className="brand-word">Planner<b>Studio</b></span>
    </span>
  )
}
