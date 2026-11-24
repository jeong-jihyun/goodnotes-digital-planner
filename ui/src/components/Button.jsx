import React from 'react'

// 버튼. href를 주면 링크(화면 이동), 아니면 버튼.
// variant: primary(보라) | alt(회색)
export default function Button({ variant = 'primary', href, children, className = '', ...rest }) {
  const cls = `btn${variant === 'alt' ? ' alt' : ''}${className ? ' ' + className : ''}`
  if (href) return <a className={cls} href={href} {...rest}>{children}</a>
  return <button type="button" className={cls} {...rest}>{children}</button>
}

export function ButtonLine({ children }) {
  return <div className="btnline">{children}</div>
}
