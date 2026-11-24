import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULTS, sanitize, validate, estimatePages } from '../domain/settings.js'

// 플래너 설정을 모든 화면이 함께 쓴다 (플래너 만들기 → 미리보기 → PDF 생성).
// 바꿀 때마다 이 기기 브라우저에 저장해서, 새로고침하거나 다시 들어와도 그대로 남는다.
// 단, 잘못 입력 중인 값(예: 노트 칸을 비운 상태)은 저장하지 않고 마지막 올바른 값을 남긴다.
const KEY = 'gdp.plannerSettings.v1'
const Ctx = createContext(null)

function load() {
  try { return sanitize(JSON.parse(localStorage.getItem(KEY))) } catch { return { ...DEFAULTS } }
}

export function PlannerSettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)
  const [savedAt, setSavedAt] = useState(null)
  const errors = useMemo(() => validate(settings), [settings])
  const valid = Object.keys(errors).length === 0

  useEffect(() => {
    if (!valid) return
    try { localStorage.setItem(KEY, JSON.stringify(settings)); setSavedAt(new Date()) } catch { /* 저장 안 돼도 화면은 동작 */ }
  }, [settings, valid])

  const set = useCallback((field, value) => setSettings((s) => ({ ...s, [field]: value })), [])
  const reset = useCallback(() => setSettings({ ...DEFAULTS }), [])

  const value = useMemo(() => ({
    settings, set, reset, errors, valid, savedAt, pages: estimatePages(settings),
  }), [settings, set, reset, errors, valid, savedAt])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePlannerSettings() {
  const v = useContext(Ctx)
  if (!v) throw new Error('PlannerSettingsProvider 안에서 써야 합니다')
  return v
}
