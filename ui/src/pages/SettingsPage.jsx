import React, { useEffect, useState } from 'react'
import { href, navigate } from '../hooks/useHashRoute.js'
import { useHistory } from '../hooks/useHistory.jsx'
import { usePlannerSettings } from '../hooks/usePlannerSettings.jsx'
import { useGeneration } from '../hooks/useGeneration.jsx'
import * as api from '../services/plannerApi.js'
import { DEFAULTS, sanitize, periodLabel, labelOf } from '../domain/settings.js'
import { themeName, FONTS } from '../domain/themes.js'
import { MAX_HISTORY, MAX_PRESETS } from '../domain/history.js'
import { when } from './ListingPage.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card, { Grid } from '../components/Card.jsx'
import Button, { ButtonLine } from '../components/Button.jsx'
import Row from '../components/Row.jsx'
import StatusTag from '../components/StatusTag.jsx'
import Notice from '../components/Notice.jsx'
import { TextField } from '../components/Field.jsx'
import { useToast } from '../components/Toast.jsx'

const summary = (raw) => {
  const s = sanitize({ ...DEFAULTS, ...raw })
  return `${periodLabel(s)} · ${labelOf('paper', s.paper)} · ${labelOf('lang', s.lang)} · ${themeName(s)}`
}

export default function SettingsPage() {
  const { history, presets, removeEntry, savePreset, removePreset, clearAll, setSelectedId } = useHistory()
  const { settings, replace, reset, valid } = usePlannerSettings()
  const gen = useGeneration()
  const toast = useToast()
  const [name, setName] = useState('')
  const [armed, setArmed] = useState(false)   // 모두 지우기: 두 번 눌러야 지워진다

  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 5000); return () => clearTimeout(t) }, [armed])

  const load = (raw, what) => { replace(raw); toast(`${what} 설정을 불러왔습니다`); navigate('create') }
  const save = () => {
    if (!name.trim()) return toast('이름을 먼저 적어 주세요')
    if (!valid) return toast("'플래너 만들기'에 고칠 칸이 있어 저장할 수 없어요")
    savePreset(name, api.toRequest(settings)); toast(`'${name.trim()}'(으)로 저장했습니다`); setName('')
  }
  const wipe = () => {
    if (!armed) { setArmed(true); return }
    clearAll(); gen.reset(); reset(); setArmed(false); toast('이 기기에 저장된 기록과 설정을 모두 지웠습니다')
  }

  return (
    <section>
      <PageHeader title="설정 및 이력" sub="만든 PDF 기록, 자주 쓰는 설정, 서버 상태를 봅니다. 모든 기록은 로그인 없이 이 기기 브라우저에만 저장돼요." />
      <Grid>
        <Card size="wide" title={`만든 PDF 기록 (${history.length}/${MAX_HISTORY})`}>
          {history.length === 0 && (
            <>
              <Row end={<span className="tiny">—</span>}>아직 기록이 없습니다</Row>
              <ButtonLine><Button href={href('generate')}>PDF 만들러 가기</Button></ButtonLine>
            </>
          )}
          <div className="hist">
            {history.map((e) => (
              <div key={e.id} className="hist-item">
                <b>{when(e.at)} · {e.pageCount?.toLocaleString()}쪽</b>
                <span className="meta">{summary(e.settings)}</span>
                <span className="meta break" style={{ textAlign: 'left' }}>{e.fileName}</span>
                <ButtonLine>
                  <Button variant="alt" onClick={() => load(e.settings, '이 기록의')}>이 설정 불러오기</Button>
                  {e.copy && <Button variant="alt" onClick={() => { setSelectedId(e.id); navigate('listing') }}>상품 문구</Button>}
                  <Button variant="alt" className="danger" onClick={() => { removeEntry(e.id); toast('기록 1개를 지웠습니다') }}>지우기</Button>
                </ButtonLine>
              </div>
            ))}
          </div>
          {history.length > 0 && <p className="tiny">PDF 파일은 서버에 1시간만 보관돼요. 다시 받으려면 '이 설정 불러오기' 후 다시 만들어 주세요.</p>}
        </Card>

        <ServerCard />

        <Card size="wide" title={`자주 쓰는 설정 (${presets.length}/${MAX_PRESETS})`}>
          <p className="tiny">지금 '플래너 만들기'에 들어 있는 설정을 이름 붙여 보관해요. 같은 이름이면 덮어써요.</p>
          <div className="preset-add">
            <TextField label="이름" value={name} onChange={setName} maxLength={30} placeholder="예: 판매용 다크 플래너"
              onKeyDown={(e) => e.key === 'Enter' && save()} />
            <Button onClick={save}>지금 설정 저장</Button>
          </div>
          {presets.map((p) => (
            <Row key={p.name} end={
              <span className="btnline" style={{ marginTop: 0 }}>
                <Button variant="alt" onClick={() => load(p.settings, `'${p.name}'`)}>적용</Button>
                <Button variant="alt" className="danger" onClick={() => { removePreset(p.name); toast(`'${p.name}'을(를) 지웠습니다`) }}>삭제</Button>
              </span>}>
              <b>{p.name}</b><br /><span className="tiny">{summary(p.settings)}</span>
            </Row>
          ))}
        </Card>

        <Card tabletFull title="기록 모두 지우기">
          <p className="tiny">이 기기에 저장된 PDF 기록·자주 쓰는 설정·상품 문구 수정본·현재 설정을 모두 지우고 처음 상태로 돌아가요. 되돌릴 수 없어요.</p>
          <ButtonLine>
            <Button className={armed ? 'danger' : ''} variant="alt" onClick={wipe}>{armed ? '한 번 더 누르면 모두 지워져요' : '모두 지우기'}</Button>
            {armed && <Button variant="alt" onClick={() => setArmed(false)}>취소</Button>}
          </ButtonLine>
        </Card>
      </Grid>
    </section>
  )
}

const FONT_LABEL = Object.fromEntries(FONTS.map((f) => [f.value, f.label]))

function ServerCard() {
  const [st, setSt] = useState({ phase: 'idle' })
  const check = async () => {
    setSt({ phase: 'loading' })
    const t0 = performance.now()
    try {
      const h = await api.health()
      setSt({ phase: 'ok', h, ms: Math.round(performance.now() - t0) })
    } catch (e) { setSt({ phase: 'fail', error: e.message }) }
  }
  useEffect(() => { if (api.apiConfigured()) check() }, [])
  if (!api.apiConfigured()) return <Card tabletFull title="서버 상태"><Notice>서버 주소가 연결되지 않은 화면이에요.</Notice></Card>
  const h = st.h
  return (
    <Card tabletFull title="서버 상태">
      <Row end={st.phase === 'ok' ? <StatusTag tone="ok">켜짐</StatusTag> : st.phase === 'fail' ? <StatusTag tone="error">응답 없음</StatusTag> : <StatusTag tone="wait">확인 중</StatusTag>}>PDF 서버</Row>
      {st.phase === 'loading' && <p className="tiny">무료 서버가 쉬고 있으면 깨우는 데 1분쯤 걸려요.</p>}
      {h && <>
        <Row end={<b>{st.ms < 1000 ? `${st.ms}ms` : `${(st.ms / 1000).toFixed(1)}초`}</b>}>응답 시간</Row>
        <Row end={<b>{h.fontReady ? '있음' : '없음'}</b>}>한글 글꼴</Row>
        <Row end={<span className="tiny">{(h.fonts || []).map((f) => FONT_LABEL[f] || f).join(' · ') || '—'}</span>}>쓸 수 있는 글꼴</Row>
        <Row end={<b>{h.running}개</b>}>지금 만드는 중</Row>
        <Row end={<span className="mono tiny">{h.commit || '—'}</span>}>배포 버전</Row>
      </>}
      {st.phase === 'fail' && <Notice tone="error">{st.error}</Notice>}
      <ButtonLine><Button variant="alt" onClick={check} disabled={st.phase === 'loading'}>다시 확인</Button></ButtonLine>
    </Card>
  )
}
