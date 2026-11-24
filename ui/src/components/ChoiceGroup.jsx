import React, { useId } from 'react'

// 여러 개 중 하나 고르기(요일·언어 등). 선택은 테두리+배경+✓ 로 함께 표시.
export default function ChoiceGroup({ label, value, onChange, options }) {
  const id = useId()
  return (
    <div className="field">
      <span className="label" id={id}>{label}</span>
      <div className="choices" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => {
          const on = o.value === value
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on}
              className={`choice${on ? ' selected' : ''}`} onClick={() => onChange(o.value)}>
              {on && <span aria-hidden="true">✓ </span>}{o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
