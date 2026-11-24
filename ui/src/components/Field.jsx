import React, { useId } from 'react'

// 입력칸 공통 틀: 이름표 + 입력 + 도움말 + 오류
// children 은 (id, describedBy) 를 받아 실제 입력 요소를 그리는 함수
export default function Field({ label, hint, error, children }) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id, describedBy, !!error)}
      {hint && !error && <span id={hintId} className="field-hint">{hint}</span>}
      {error && <span id={errId} className="field-error">⚠ {error}</span>}
    </div>
  )
}

export function SelectField({ label, hint, error, value, onChange, options }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id, db, invalid) => (
        <select id={id} aria-describedby={db} aria-invalid={invalid || undefined}
          value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </Field>
  )
}

export function TextField({ label, hint, error, value, onChange, multiline, rows = 4, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id, db, invalid) => multiline
        ? <textarea id={id} rows={rows} aria-describedby={db} aria-invalid={invalid || undefined}
            value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
        : <input id={id} aria-describedby={db} aria-invalid={invalid || undefined}
            value={value} onChange={(e) => onChange(e.target.value)} {...rest} />}
    </Field>
  )
}
