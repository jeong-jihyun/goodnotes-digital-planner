// 웹 브라우저 → Render 의 PDF 생성 서버 호출.
// 서버 주소는 배포 설정(VITE_API_BASE)에서 받는다. 비어 있으면 '서버 미연결'로 보여 준다.
export const API_BASE = (import.meta.env?.VITE_API_BASE || '').replace(/\/$/, '')
export const apiConfigured = () => !!API_BASE

export class ApiError extends Error {
  constructor(code, message, status) { super(message); this.code = code; this.status = status }
}

async function call(path, { method = 'GET', body, timeout = 90000 } = {}) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeout)
  try {
    const res = await fetch(API_BASE + path, {
      method, signal: ctl.signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new ApiError(data.code || 'HTTP_' + res.status, data.message || '서버 응답 오류', res.status)
    return data
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (e.name === 'AbortError') throw new ApiError('TIMEOUT', '서버 응답이 너무 늦습니다. 잠시 후 다시 눌러 주세요.')
    throw new ApiError('NETWORK', '서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.')
  } finally { clearTimeout(t) }
}

// 화면 설정 → 서버 요청 (서버가 받는 칸만 보낸다)
export const toRequest = (s) => ({
  year: s.year, weekStart: s.weekStart, lang: s.lang, theme: s.theme, paper: s.paper,
  linkScope: s.linkScope, weekly: s.weekly, daily: s.daily, notes: s.notes,
  startMonth: s.startMonth, months: s.months, holidays: s.holidays,
  extras: s.extras, dailyLayout: s.dailyLayout, noteStyle: s.noteStyle,
  // 꾸미기: 앞뒤 빈칸은 지워서 보낸다 (빈칸만 있으면 '안 씀')
  customColor: s.customColor.toUpperCase(), fontFamily: s.fontFamily,
  title: s.title.trim(), owner: s.owner.trim(), motto: s.motto.trim(),
})

export const health = () => call('/health', { timeout: 90000 })
export const createGeneration = (s) => call('/api/v1/generations', { method: 'POST', body: toRequest(s) })
export const getGeneration = (id) => call(`/api/v1/generations/${encodeURIComponent(id)}`, { timeout: 30000 })
export const createPreview = (s) => call('/api/v1/previews', { method: 'POST', body: toRequest(s) })
export const downloadUrl = (id) => `${API_BASE}/api/v1/generations/${encodeURIComponent(id)}/download`
