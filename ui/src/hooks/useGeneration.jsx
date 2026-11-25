import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import * as api from '../services/plannerApi.js'
import { useHistory } from './useHistory.jsx'

// PDF 생성 진행 상태. 다른 화면으로 갔다 와도, 새로고침해도(1시간 안) 이어서 보여 준다.
// phase: idle → waking(서버 깨우는 중) → submitting → queued/processing/verifying → succeeded | failed
const KEY = 'gdp.lastGeneration.v1'
const Ctx = createContext(null)
const TERMINAL = new Set(['succeeded', 'failed', 'expired'])

const sig = (s) => JSON.stringify(api.toRequest(s))   // 결과가 어떤 설정으로 만든 것인지 비교용

function loadLast() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    if (v && v.id && Date.now() - v.at < 3600_000) return v
  } catch { /* 무시 */ }
  return null
}

export function GenerationProvider({ children }) {
  const last = useRef(loadLast())
  const [state, setState] = useState(() => last.current
    ? { phase: 'processing', job: null, error: null, id: last.current.id, sig: last.current.sig, at: last.current.at }
    : { phase: 'idle', job: null, error: null, id: null, sig: null, at: null })
  const timer = useRef()
  const { record } = useHistory()

  // 성공하면 기록에 남긴다 (같은 작업은 한 번만 — 다시 확인해도 겹치지 않음)
  useEffect(() => {
    if (state.phase === 'succeeded' && state.job?.result && state.id && state.sig) {
      try { record(state.id, JSON.parse(state.sig), state.job.result) } catch { /* 무시 */ }
    }
  }, [state.phase, state.job, state.id, state.sig, record])

  const poll = useCallback(async (id) => {
    try {
      const job = await api.getGeneration(id)
      const phase = job.status === 'expired' ? 'failed' : job.status
      setState((s) => (s.id !== id ? s : {
        ...s, job, phase,
        error: job.status === 'failed' ? job.error : job.status === 'expired' ? { code: 'FILE_EXPIRED', message: '파일 보관 시간(1시간)이 지났습니다. 다시 만들어 주세요.' } : null,
      }))
      if (!TERMINAL.has(job.status)) timer.current = setTimeout(() => poll(id), 1000)
    } catch (e) {
      // 작업이 서버에서 사라졌으면(서버 재시작 등) 끝난 것으로 처리, 그 외 일시 오류는 몇 초 뒤 다시
      if (e.status === 404) setState((s) => (s.id !== id ? s : { ...s, phase: 'failed', error: { code: e.code, message: '서버에서 작업을 찾지 못했습니다. 다시 만들어 주세요.' } }))
      else timer.current = setTimeout(() => poll(id), 3000)
    }
  }, [])

  useEffect(() => {
    if (last.current && api.apiConfigured()) poll(last.current.id)
    else if (last.current) setState((s) => ({ ...s, phase: 'idle', id: null }))
    return () => clearTimeout(timer.current)
  }, [poll])

  const start = useCallback(async (settings) => {
    clearTimeout(timer.current)
    const at = Date.now()
    setState({ phase: 'submitting', job: null, error: null, id: null, sig: sig(settings), at })
    // 무료 서버는 오래 안 쓰면 잠든다 → 4초 넘게 답이 없으면 '깨우는 중'으로 알려 준다
    const slow = setTimeout(() => setState((s) => (s.phase === 'submitting' ? { ...s, phase: 'waking' } : s)), 4000)
    try {
      const r = await api.createGeneration(settings)
      clearTimeout(slow)
      try { localStorage.setItem(KEY, JSON.stringify({ id: r.generationId, sig: sig(settings), at })) } catch { /* 무시 */ }
      setState((s) => ({ ...s, phase: 'queued', id: r.generationId }))
      poll(r.generationId)
    } catch (e) {
      clearTimeout(slow)
      setState((s) => ({ ...s, phase: 'failed', error: { code: e.code, message: e.message } }))
    }
  }, [poll])

  const reset = useCallback(() => {
    clearTimeout(timer.current)
    try { localStorage.removeItem(KEY) } catch { /* 무시 */ }
    setState({ phase: 'idle', job: null, error: null, id: null, sig: null, at: null })
  }, [])

  return <Ctx.Provider value={{ ...state, start, reset, sigOf: sig }}>{children}</Ctx.Provider>
}

export function useGeneration() {
  const v = useContext(Ctx)
  if (!v) throw new Error('GenerationProvider 안에서 써야 합니다')
  return v
}
