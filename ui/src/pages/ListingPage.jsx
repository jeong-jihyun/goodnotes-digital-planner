import React, { useMemo, useState } from 'react'
import { href } from '../hooks/useHashRoute.js'
import { useHistory } from '../hooks/useHistory.jsx'
import { usePreview } from '../hooks/usePreview.js'
import { apiConfigured } from '../services/plannerApi.js'
import { copyText } from '../services/clipboard.js'
import { DEFAULTS, sanitize, periodLabel, labelOf } from '../domain/settings.js'
import { themeName } from '../domain/themes.js'
import { RULES, CHECKS, checkCopy, currentCopy, fullText, tagsToText, textToTags } from '../domain/listing.js'
import PageHeader from '../components/PageHeader.jsx'
import Card, { Grid } from '../components/Card.jsx'
import Button, { ButtonLine } from '../components/Button.jsx'
import Row from '../components/Row.jsx'
import Notice from '../components/Notice.jsx'
import ChoiceGroup from '../components/ChoiceGroup.jsx'
import MultiChoice from '../components/MultiChoice.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { SelectField, TextField } from '../components/Field.jsx'
import { useToast } from '../components/Toast.jsx'

const LANGS = [{ value: 'ko', label: '한국어 (국내 판매처)' }, { value: 'en', label: 'English (Etsy 등)' }]
export const when = (at) => new Date(at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function ListingPage() {
  const { history, listing, selectedId, setSelectedId, updateListing } = useHistory()
  const toast = useToast()
  const [lang, setLang] = useState('ko')
  const withCopy = history.filter((e) => e.copy)
  const entry = withCopy.find((e) => e.id === selectedId) || withCopy[0]

  if (!entry) {
    return (
      <section>
        <PageHeader title="상품 등록 관리" sub="만든 플래너로 판매처에 올릴 상품명·설명·태그와 대표 이미지를 준비합니다." />
        <Grid>
          <Card size="full" title="아직 만든 플래너가 없어요">
            <p className="tiny">PDF를 한 번 만들면 그 설정에 맞는 상품 문구(한국어·영어)가 여기에 자동으로 생겨요.</p>
            <ButtonLine><Button href={href('generate')}>PDF 만들러 가기</Button><Button variant="alt" href={href('create')}>설정부터 고르기</Button></ButtonLine>
          </Card>
        </Grid>
      </section>
    )
  }

  const state = listing[entry.id] || {}
  const copy = currentCopy(entry, state.edits, lang)
  const warn = checkCopy(lang, copy)
  const rule = RULES[lang]
  const edit = (field, value) => updateListing(entry.id, { edits: { ...(state.edits || {}), [lang]: { ...(state.edits?.[lang] || {}), [field]: value } } })
  const revert = () => { const e = { ...(state.edits || {}) }; delete e[lang]; updateListing(entry.id, { edits: e }); toast('원래 문구로 되돌렸습니다') }
  const copyOut = async (text, what) => toast((await copyText(text)) ? `${what}을(를) 복사했습니다` : '복사가 막혀 있어요. 글을 길게 눌러 직접 복사해 주세요')
  const checked = state.checks || []
  const s = sanitize({ ...DEFAULTS, ...entry.settings })

  return (
    <section>
      <PageHeader title="상품 등록 관리" sub="만든 플래너로 판매처에 올릴 상품명·설명·태그와 대표 이미지를 준비합니다. 판매처 등록은 직접 붙여넣어 주세요." />
      <Grid>
        <Card size="wide" title="상품 문구">
          {withCopy.length > 1 && (
            <SelectField label="어떤 플래너의 문구인가요?" value={entry.id} onChange={setSelectedId}
              options={withCopy.map((e) => ({ value: e.id, label: `${when(e.at)} · ${periodLabel(sanitize({ ...DEFAULTS, ...e.settings }))} · ${e.pageCount}쪽` }))} />
          )}
          <ChoiceGroup label="문구 언어" value={lang} onChange={setLang} options={LANGS} />

          <TextField label="상품명" value={copy.title} onChange={(v) => edit('title', v)}
            hint={`${rule.where} 기준 ${rule.title}자까지 · 지금 ${[...copy.title].length}자`} error={warn.title} />
          <ButtonLine><Button variant="alt" onClick={() => copyOut(copy.title, '상품명')}>상품명 복사</Button></ButtonLine>

          <TextField label="상품 설명" multiline rows={9} value={copy.description} onChange={(v) => edit('description', v)}
            hint="자유롭게 고쳐도 돼요. 고친 내용은 이 기기에 저장돼요" />
          <ButtonLine><Button variant="alt" onClick={() => copyOut(copy.description, '설명')}>설명 복사</Button></ButtonLine>

          <TextField label="태그 (쉼표로 구분)" value={tagsToText(copy.tags)} onChange={(v) => edit('tags', textToTags(v))}
            hint={`${rule.tags}개까지, 한 개 ${rule.tag}자까지 · 지금 ${copy.tags.length}개`} error={warn.tags} />
          <ButtonLine>
            <Button variant="alt" onClick={() => copyOut(tagsToText(copy.tags), '태그')}>태그 복사</Button>
          </ButtonLine>

          <ButtonLine>
            <Button onClick={() => copyOut(fullText(copy), '전체 문구')}>전체 한 번에 복사</Button>
            {copy.edited && <Button variant="alt" onClick={revert}>원래 문구로 되돌리기</Button>}
          </ButtonLine>
          <Notice>판매처(Etsy 등)에 자동으로 올리지는 않아요. 복사해서 직접 붙여넣어 주세요.</Notice>
        </Card>

        <Card tabletFull title="등록 체크리스트">
          <Row end={<b>{checked.length}/{CHECKS.length}</b>}>진행</Row>
          <MultiChoice label="끝낸 일을 눌러 체크하세요" value={checked}
            onChange={(v) => updateListing(entry.id, { checks: v })}
            options={CHECKS.map((c) => ({ value: c.key, label: c.label, desc: c.desc }))} />
          <Row end={<span className="tiny">{themeName(s)} · {labelOf('paper', s.paper)}</span>}>이 플래너</Row>
          <Row end={<span className="tiny break">{entry.fileName}</span>}>파일</Row>
        </Card>

        <ImagesCard settings={s} />
      </Grid>
    </section>
  )
}

// 대표 이미지: 미리보기 그림을 상품 사진용으로 내려받는다
function ImagesCard({ settings }) {
  const canUse = apiConfigured() && !(typeof window !== 'undefined' && window.planner)
  const [on, setOn] = useState(false)          // 서버를 쓰므로 눌렀을 때만 만든다
  const pv = usePreview(settings, on && canUse)
  const list = pv.data?.pages || []
  const busy = pv.phase === 'loading' || pv.phase === 'waking'
  const name = useMemo(() => `planner_${settings.year}_${settings.theme}`, [settings])
  return (
    <Card size="full" title="대표 이미지">
      {!canUse && <Notice>서버가 연결된 웹 화면에서만 그림을 만들 수 있어요.</Notice>}
      {canUse && !on && list.length === 0 && (
        <>
          <p className="tiny">이 플래너의 표지·연간·월간 등 대표 쪽을 그림(JPG)으로 만들어 내려받아요.</p>
          <ButtonLine><Button onClick={() => setOn(true)}>대표 이미지 만들기</Button></ButtonLine>
        </>
      )}
      {busy && <ProgressBar label="그림 만드는 중" />}
      {pv.phase === 'waking' && <Notice>무료 서버를 깨우는 중이에요. 처음 한 번은 1분쯤 걸릴 수 있어요.</Notice>}
      {pv.phase === 'failed' && <Notice tone="error">{pv.error} <button type="button" className="linklike" onClick={pv.reload}>다시 시도</button></Notice>}
      {list.length > 0 && (
        <>
          <div className="shots">
            {list.map((p) => (
              <figure key={p.kind} className="shot">
                <img src={p.image} alt={`${p.label} 그림`} width={p.width} height={p.height} />
                <figcaption>
                  <span>{p.label}</span>
                  <a className="btn alt" href={p.image} download={`${name}_${p.kind}.jpg`}>내려받기</a>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="tiny">그림 크기는 가로 960px예요. 아이폰에서 내려받기가 안 되면 그림을 길게 눌러 '사진에 저장'을 고르세요.</p>
        </>
      )}
    </Card>
  )
}
