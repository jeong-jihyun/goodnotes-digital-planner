import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// 이 기기 브라우저에만 저장하는 것들 (로그인 없음)
//  - history : 만든 PDF 기록 (최근 30개). 설정·쪽수·상품 문구를 함께 남겨서, 파일이 지워진 뒤에도 문구는 쓸 수 있다.
//  - presets : 자주 쓰는 설정 (이름 붙여 20개까지)
//  - listing : 기록별 상품 문구 수정본·체크리스트
import { KEYS, addEntry, addPreset, makeEntry } from '../domain/history.js'

const Ctx = createContext(null)

function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v ?? fallback
  } catch { return fallback }
}
function write(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* 저장 공간이 꽉 차도 화면은 동작 */ }
}

export function HistoryProvider({ children }) {
  const [history, setHistory] = useState(() => (Array.isArray(read(KEYS.history, [])) ? read(KEYS.history, []) : []))
  const [presets, setPresets] = useState(() => (Array.isArray(read(KEYS.presets, [])) ? read(KEYS.presets, []) : []))
  const [listing, setListing] = useState(() => read(KEYS.listing, {}) || {})
  const [selectedId, setSelectedId] = useState(null)   // 상품 화면에서 볼 기록 (없으면 가장 최근)

  useEffect(() => write(KEYS.history, history), [history])
  useEffect(() => write(KEYS.presets, presets), [presets])
  useEffect(() => write(KEYS.listing, listing), [listing])

  const record = useCallback((id, request, result) => setHistory((h) => addEntry(h, makeEntry(id, request, result))), [])
  const removeEntry = useCallback((id) => {
    setHistory((h) => h.filter((e) => e.id !== id))
    setListing((l) => { const n = { ...l }; delete n[id]; return n })
  }, [])
  const savePreset = useCallback((name, settings) => setPresets((p) => addPreset(p, name, settings)), [])
  const removePreset = useCallback((name) => setPresets((p) => p.filter((x) => x.name !== name)), [])
  const updateListing = useCallback((id, patch) => setListing((l) => ({ ...l, [id]: { ...(l[id] || {}), ...patch } })), [])

  // 이 기기에 저장된 플래너 스튜디오 정보를 모두 지운다 (gdp. 로 시작하는 것만)
  const clearAll = useCallback(() => {
    try { Object.keys(localStorage).filter((k) => k.startsWith('gdp.')).forEach((k) => localStorage.removeItem(k)) } catch { /* 무시 */ }
    setHistory([]); setPresets([]); setListing({}); setSelectedId(null)
  }, [])

  const value = useMemo(() => ({
    history, presets, listing, selectedId, setSelectedId,
    record, removeEntry, savePreset, removePreset, updateListing, clearAll,
  }), [history, presets, listing, selectedId, record, removeEntry, savePreset, removePreset, updateListing, clearAll])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useHistory() {
  const v = useContext(Ctx)
  if (!v) throw new Error('HistoryProvider 안에서 써야 합니다')
  return v
}
