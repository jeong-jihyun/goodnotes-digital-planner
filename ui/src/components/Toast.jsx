import React, { createContext, useCallback, useContext, useRef, useState } from 'react'

// 화면 아래에 잠깐 뜨는 안내 문구 (시안의 toast)
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  const timer = useRef()
  const toast = useCallback((t) => {
    setMsg(t); setShow(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setShow(false), 2100)
  }, [])
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className={`toast${show ? ' show' : ''}`} role="status" aria-live="polite">{msg}</div>
    </ToastCtx.Provider>
  )
}
