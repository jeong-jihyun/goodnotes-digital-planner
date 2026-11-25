// 상품 문구 도우미 (순수 함수 — node --test 로 검사)
// Etsy 기준: 상품명 140자, 태그 13개·각 20자. 한국 판매처는 상품명 50자 정도가 보기 좋다.
export const RULES = {
  ko: { title: 50, tags: 10, tag: 20, where: '국내 판매처(크몽·스마트스토어 등)' },
  en: { title: 140, tags: 13, tag: 20, where: 'Etsy 등 해외 판매처' },
}

export const CHECKS = [
  { key: 'image', label: '대표 이미지 준비', desc: '아래 그림을 내려받아 상품 사진으로 올리기' },
  { key: 'copy', label: '상품 설명 검토', desc: '문구를 읽고 내 말투로 다듬기' },
  { key: 'price', label: '가격 및 라이선스 결정', desc: '개인용/상업용, 가격 정하기' },
  { key: 'channel', label: '판매 채널 등록', desc: '판매처에 직접 붙여넣어 등록 (자동 등록 안 함)' },
]

export const tagsToText = (tags) => (tags || []).join(', ')
export const textToTags = (text) => text.split(/[,\n]/).map((t) => t.trim()).filter(Boolean)
const len = (s) => [...(s || '')].length

// 고칠 점만 돌려준다: { title?, tags? }
export function checkCopy(lang, { title, tags }) {
  const r = RULES[lang], w = {}
  if (!title.trim()) w.title = '상품명이 비어 있어요'
  else if (len(title) > r.title) w.title = `${r.where}는 상품명 ${r.title}자까지가 좋아요 (지금 ${len(title)}자)`
  const long = tags.filter((t) => len(t) > r.tag)
  if (tags.length > r.tags) w.tags = `태그는 ${r.tags}개까지 (지금 ${tags.length}개)`
  else if (long.length) w.tags = `태그 한 개는 ${r.tag}자까지: ${long.join(', ')}`
  return w
}

// 수정본이 있으면 수정본, 없으면 엔진 문구
export function currentCopy(entry, edits, lang) {
  const base = entry?.copy?.[lang]
  const e = edits?.[lang] || {}
  if (!base && !e.title) return null
  return {
    title: e.title ?? base.title,
    description: e.description ?? base.description,
    tags: e.tags ?? base.tags,
    edited: !!edits?.[lang],
  }
}

export function fullText(c) {
  return `${c.title}\n\n${c.description}\n\n${tagsToText(c.tags)}`
}
