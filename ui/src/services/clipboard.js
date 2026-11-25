// 글 복사. 최신 방식이 막힌 브라우저(오래된 아이폰·http 등)는 예전 방식으로 한 번 더 시도한다.
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true }
  } catch { /* 아래 방법으로 */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok
  } catch { return false }
}
