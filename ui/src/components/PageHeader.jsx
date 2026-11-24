import React from 'react'

export default function PageHeader({ title, sub }) {
  return (
    <>
      <h1>{title}</h1>
      {sub && <p className="sub">{sub}</p>}
    </>
  )
}
