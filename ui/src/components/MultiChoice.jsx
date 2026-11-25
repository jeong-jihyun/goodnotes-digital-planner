import React, { useId } from 'react'

// 여러 개 고르기 (추가 페이지 등). 누를 때마다 켜고 끄며, 켜진 것은 테두리+배경+✓ 로 함께 표시.
export default function MultiChoice({ label, value, onChange, options, hint }) {
  const id = useId()
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <div className="field">
      <span className="label" id={id}>{label}</span>
      <div className="multi" role="group" aria-labelledby={id}>
        {options.map((o) => {
          const on = value.includes(o.value)
          return (
            <button key={o.value} type="button" aria-pressed={on}
              className={`multi-item${on ? ' selected' : ''}`} onClick={() => toggle(o.value)}>
              <span className="multi-check" aria-hidden="true">{on ? '✓' : ''}</span>
              <span className="multi-text"><b>{o.label}</b>{o.desc && <small>{o.desc}</small>}</span>
            </button>
          )
        })}
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}
