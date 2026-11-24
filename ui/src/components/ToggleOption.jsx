import React, { useId } from 'react'

// 켜기/끄기 스위치 (주간·일간 페이지 포함 등). 상태 글자(켜짐/꺼짐)를 함께 보여 준다.
export default function ToggleOption({ label, desc, checked, onChange }) {
  const id = useId()
  return (
    <div className="toggle-row">
      <span className="toggle-text">
        <span id={id} className="toggle-label">{label}</span>
        {desc && <span className="tiny">{desc}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={id}
        className={`switch${checked ? ' on' : ''}`} onClick={() => onChange(!checked)}>
        <span className="switch-knob" aria-hidden="true" />
        <span className="switch-text">{checked ? '켜짐' : '꺼짐'}</span>
      </button>
    </div>
  )
}
