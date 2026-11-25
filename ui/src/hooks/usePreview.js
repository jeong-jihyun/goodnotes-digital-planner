import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../services/plannerApi.js'

// 미리보기 상태. 같은 설정은 이 화면을 다시 열어도 다시 부르지 않는다(메모리 보관, 최대 10개).
const memo = new Map()
const sigOf = (s) => JSON.stringify(api.toRequest(s))

export function usePreview(settings, enabled) {
  const sig = sigOf(settings)
  const [state, setState] = useState(() => (memo.has(sig) ? { phase: 'done', data: memo.get(sig), error: null } : { phase: 'idle', data: null, error: null }))
  const reqId = useRef(0)

  const load = useCallback(async () => {
    const id = ++reqId.current
    if (memo.has(sig)) { setState({ phase: 'done', data: memo.get(sig), error: null }); return }
    setState((s) => ({ phase: 'loading', data: s.data, error: null }))
    // 4초 넘게 걸리면 '서버 깨우는 중' 안내
    const slow = setTimeout(() => { if (id === reqId.current) setState((s) => (s.phase === 'loading' ? { ...s, phase: 'waking' } : s)) }, 4000)
    try {
      const data = await api.createPreview(settings)
      if (id !== reqId.current) return          // 그 사이 설정이 바뀌었으면 버린다
      memo.set(sig, data)
      if (memo.size > 10) memo.delete(memo.keys().next().value)
      setState({ phase: 'done', data, error: null })
    } catch (e) {
      if (id !== reqId.current) return
      setState((s) => ({ phase: 'failed', data: s.data, error: e.message }))
    } finally { clearTimeout(slow) }
  }, [sig]) // eslint-disable-line

  // 화면에 들어오면(설정이 올바르면) 자동으로 한 번 만든다
  useEffect(() => { if (enabled) load() }, [enabled, load])

  return { ...state, reload: load }
}
