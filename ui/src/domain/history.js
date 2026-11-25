// 기록·저장한 설정 다루기 (순수 함수 — node --test 로 검사)
export const KEYS = { history: 'gdp.history.v1', presets: 'gdp.presets.v1', listing: 'gdp.listing.v1' }
export const MAX_HISTORY = 30
export const MAX_PRESETS = 20

// 기록 한 줄 만들기 (순수 함수 — 테스트용으로 내보냄)
export function makeEntry(id, request, result, at = Date.now()) {
  return {
    id, at, settings: request,
    fileName: result.fileName, pageCount: result.pageCount, linkCount: result.linkCount, sizeMb: result.sizeMb,
    copy: result.copy || null,
  }
}

export function addEntry(list, entry) {
  return [entry, ...list.filter((e) => e.id !== entry.id)].slice(0, MAX_HISTORY)
}

export function addPreset(list, name, settings) {
  const clean = name.trim().slice(0, 30)
  return [{ name: clean, settings, at: Date.now() }, ...list.filter((p) => p.name !== clean)].slice(0, MAX_PRESETS)
}

