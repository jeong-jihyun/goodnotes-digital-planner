import React, { useEffect, useId, useState } from 'react'
import { THEMES, customSub, isHex } from '../domain/themes.js'

// 견본: 큰 칸 = 메인색, 오른쪽 아래 = 보조색, 종이색이 있으면 테두리로 보여 준다
function Swatch({ main, sub, bg }) {
  return (
    <span className="swatch" style={{ background: main, boxShadow: bg ? `inset 0 0 0 4px ${bg}` : undefined }} aria-hidden="true">
      <span style={{ background: sub }} />
    </span>
  )
}

// 테마 카드 8개 + '직접 고르기' 카드. 직접 고르기를 누르면 색 고르는 칸이 열린다.
// color/onColor 를 안 주면 직접 고르기 카드는 숨긴다 (컴포넌트 견본 화면용).
export default function ThemePicker({ value, onChange, label = '테마', color, onColor, colorError }) {
  const id = useId()
  const custom = typeof onColor === 'function'
  return (
    <div className="field">
      <span className="label" id={id}>{label}</span>
      <div className="themes" role="radiogroup" aria-labelledby={id}>
        {THEMES.map((t) => {
          const on = t.id === value
          return (
            <button key={t.id} type="button" role="radio" aria-checked={on}
              className={`theme-card${on ? ' selected' : ''}`} onClick={() => onChange(t.id)}>
              <Swatch main={t.main} sub={t.sub} bg={t.bg} />
              <span className="theme-name">{t.name}<small>{t.id}</small></span>
              {on && <span className="theme-check" aria-hidden="true">✓</span>}
            </button>
          )
        })}
        {custom && (
          <button type="button" role="radio" aria-checked={value === 'custom'}
            className={`theme-card theme-custom${value === 'custom' ? ' selected' : ''}`} onClick={() => onChange('custom')}>
            <Swatch main={isHex(color) ? color : '#CCCCCC'} sub={isHex(color) ? customSub(color) : '#EEEEEE'} />
            <span className="theme-name">직접 고르기<small>내 색 하나</small></span>
            {value === 'custom' && <span className="theme-check" aria-hidden="true">✓</span>}
          </button>
        )}
      </div>
      {custom && value === 'custom' && <ColorInput value={color} onChange={onColor} error={colorError} />}
    </div>
  )
}

// 색 고르기: 색상판 + 직접 입력(#RRGGBB). 입력 중 틀린 값은 칸 안에만 두고, 맞을 때만 저장한다.
function ColorInput({ value, onChange, error }) {
  const id = useId()
  const [text, setText] = useState(value)
  useEffect(() => { setText(value) }, [value])
  const typed = text.startsWith('#') ? text : '#' + text
  const bad = text !== '' && !isHex(typed)
  return (
    <div className={`color-pick${bad || error ? ' has-error' : ''}`}>
      <input type="color" aria-label="메인색 고르기" value={isHex(value) ? value.toLowerCase() : '#6558d3'}
        onChange={(e) => onChange(e.target.value.toUpperCase())} />
      <label htmlFor={id} className="sr-only">메인색 코드</label>
      <input id={id} className="hex" value={text} maxLength={7} spellCheck={false} inputMode="text"
        aria-invalid={bad || undefined}
        onChange={(e) => {
          const v = e.target.value.trim()
          setText(v)
          const h = v.startsWith('#') ? v : '#' + v
          if (isHex(h)) onChange(h.toUpperCase())
        }} />
      <span className="field-hint">{bad ? '⚠ #과 6자리(0~9, A~F)로 입력해 주세요. 예: #6558D3'
        : '머리띠·선에 쓰여요. 연한 칸 색은 자동으로 맞추고, 너무 밝으면 글자·선을 알아서 진하게 해요'}</span>
    </div>
  )
}
