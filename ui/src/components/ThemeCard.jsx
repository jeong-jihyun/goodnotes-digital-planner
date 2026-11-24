import React, { useId } from 'react'
import { THEMES } from '../domain/themes.js'

// 테마 선택 카드 4개. 색 견본 + 이름 + 선택 ✓
export default function ThemePicker({ value, onChange, label = '테마' }) {
  const id = useId()
  return (
    <div className="field">
      <span className="label" id={id}>{label}</span>
      <div className="themes" role="radiogroup" aria-labelledby={id}>
        {THEMES.map((t) => {
          const on = t.id === value
          return (
            <button key={t.id} type="button" role="radio" aria-checked={on}
              className={`theme-card${on ? ' selected' : ''}`} onClick={() => onChange(t.id)}>
              <span className="swatch" style={{ background: t.main }} aria-hidden="true">
                <span style={{ background: t.sub }} />
              </span>
              <span className="theme-name">{t.name}<small>{t.id}</small></span>
              {on && <span className="theme-check" aria-hidden="true">✓</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
