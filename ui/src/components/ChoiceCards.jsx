import React, { useId } from 'react'

// 하나만 고르는 카드 목록 (설명이 필요한 선택: 글꼴 등). '추가 페이지' 카드와 같은 모양, 체크만 동그라미.
export default function ChoiceCards({ label, value, onChange, options, hint }) {
  const id = useId()
  return (
    <div className="field">
      <span className="label" id={id}>{label}</span>
      <div className="multi" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => {
          const on = o.value === value
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on}
              className={`multi-item${on ? ' selected' : ''}`} onClick={() => onChange(o.value)}>
              <span className="multi-check round" aria-hidden="true">{on ? '✓' : ''}</span>
              <span className="multi-text"><b>{o.label}</b>{o.desc && <small>{o.desc}</small>}</span>
            </button>
          )
        })}
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}
