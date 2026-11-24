import React, { useEffect, useState } from 'react'
import Field from './Field.jsx'

// 숫자 입력: − / + 버튼 + 직접 입력
// - 입력 중에는 빈칸·범위 밖 값도 잠시 허용하고, 오류 문구로 알려 준다(자동으로 바꿔치기하지 않음).
// - onChange 에는 정수일 때만 숫자, 아니면 NaN 을 넘긴다.
export default function NumberField({ label, hint, error, value, onChange, min, max, step = 1, unit }) {
  const [text, setText] = useState(String(value))
  // 바깥에서 값이 바뀌면(예: 초기화) 칸 글자도 맞춘다
  useEffect(() => { if (!Number.isNaN(value) && Number(text) !== value) setText(String(value)) }, [value]) // eslint-disable-line

  const commit = (t) => {
    setText(t)
    onChange(/^-?\d+$/.test(t.trim()) ? Number(t) : NaN)
  }
  const bump = (d) => {
    const base = Number.isNaN(value) ? (min ?? 0) : value
    const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, base + d))
    commit(String(next))
  }
  return (
    <Field label={label} hint={hint} error={error}>
      {(id, db, invalid) => (
        <div className="stepper">
          <button type="button" className="stepper-btn" onClick={() => bump(-step)}
            disabled={!Number.isNaN(value) && min !== undefined && value <= min} aria-label={`${label} 줄이기`}>−</button>
          <input id={id} inputMode="numeric" aria-describedby={db} aria-invalid={invalid || undefined}
            value={text} onChange={(e) => commit(e.target.value)} />
          {unit && <span className="stepper-unit" aria-hidden="true">{unit}</span>}
          <button type="button" className="stepper-btn" onClick={() => bump(step)}
            disabled={!Number.isNaN(value) && max !== undefined && value >= max} aria-label={`${label} 늘리기`}>+</button>
        </div>
      )}
    </Field>
  )
}
