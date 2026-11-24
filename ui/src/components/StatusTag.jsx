import React from 'react'

// 상태 표시. 색만으로 구분하지 않도록 글자를 항상 함께 쓴다.
// tone: ok(초록) | wait(회색) | warn(주황) | error(빨강) | info(보라)
export default function StatusTag({ tone = 'ok', children }) {
  return <span className={`tag ${tone}`}>{children}</span>
}
