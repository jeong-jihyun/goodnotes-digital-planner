import React, { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card, { Grid } from '../components/Card.jsx'
import Button, { ButtonLine } from '../components/Button.jsx'
import Row from '../components/Row.jsx'
import StatusTag from '../components/StatusTag.jsx'
import Notice from '../components/Notice.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { href } from '../hooks/useHashRoute.js'
import { usePlannerSettings } from '../hooks/usePlannerSettings.jsx'
import { useGeneration } from '../hooks/useGeneration.jsx'
import { labelOf, periodLabel } from '../domain/settings.js'
import { themeName } from '../domain/themes.js'
import * as api from '../services/plannerApi.js'

// 진행 단계 (서버가 실제로 알려 주는 상태만 표시, 퍼센트는 지어내지 않음)
const STEPS = [
  { key: 'send', label: '요청 보내기', phases: ['submitting', 'waking'] },
  { key: 'make', label: 'PDF 만드는 중', phases: ['queued', 'processing'] },
  { key: 'check', label: '링크 검사 중', phases: ['verifying'] },
  { key: 'done', label: '완료', phases: ['succeeded'] },
]
const ORDER = ['submitting', 'waking', 'queued', 'processing', 'verifying', 'succeeded']
const BUSY = new Set(['submitting', 'waking', 'queued', 'processing', 'verifying'])

function stepTone(step, phase) {
  const idx = ORDER.indexOf(phase)
  const first = Math.min(...step.phases.map((p) => ORDER.indexOf(p)))
  const lastIdx = Math.max(...step.phases.map((p) => ORDER.indexOf(p)))
  if (step.phases.includes(phase)) return phase === 'succeeded' ? ['ok', '완료'] : ['info', '진행 중']
  if (idx > lastIdx) return ['ok', '완료']
  if (idx >= 0 && idx < first) return ['wait', '대기']
  return ['wait', '대기']
}

const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

export default function GeneratePage() {
  const { settings, valid, pages } = usePlannerSettings()
  const gen = useGeneration()
  const [server, setServer] = useState(api.apiConfigured() ? 'checking' : 'none')
  const [log, setLog] = useState('')
  const [desktopBusy, setDesktopBusy] = useState(false)
  const isDesktop = typeof window !== 'undefined' && !!window.planner
  const busy = BUSY.has(gen.phase)
  const res = gen.job?.result
  const stale = gen.phase === 'succeeded' && gen.sig !== gen.sigOf(settings)

  // 끝나면(성공·실패) 결과 카드로 화면을 옮겨 준다 — 폰에서는 결과가 화면 아래에 생기기 때문
  const resultRef = useRef(null)
  const prevPhase = useRef(gen.phase)
  useEffect(() => {
    const was = prevPhase.current
    prevPhase.current = gen.phase
    if (BUSY.has(was) && (gen.phase === 'succeeded' || gen.phase === 'failed')) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [gen.phase])

  // 들어오자마자 서버를 한 번 불러 둔다 (잠든 서버를 미리 깨우는 효과)
  useEffect(() => {
    if (!api.apiConfigured() || isDesktop) return
    let alive = true
    const slow = setTimeout(() => alive && setServer((s) => (s === 'checking' ? 'waking' : s)), 3000)
    api.health()
      .then((h) => alive && setServer(h.fontReady ? 'ok' : 'nofont'))
      .catch(() => alive && setServer('down'))
      .finally(() => clearTimeout(slow))
    return () => { alive = false; clearTimeout(slow) }
  }, [isDesktop])

  async function runDesktop() {
    setDesktopBusy(true); setLog('생성 중...')
    try { setLog(JSON.stringify(await window.planner.generate(settings), null, 2)) }
    catch (e) { setLog('오류: ' + e.message) }
    setDesktopBusy(false)
  }

  const serverRow = {
    none: <StatusTag tone="wait">미연결</StatusTag>,
    checking: <StatusTag tone="info">확인 중</StatusTag>,
    waking: <StatusTag tone="warn">깨우는 중</StatusTag>,
    ok: <StatusTag tone="ok">연결됨</StatusTag>,
    nofont: <StatusTag tone="error">한글 글꼴 없음</StatusTag>,
    down: <StatusTag tone="error">연결 안 됨</StatusTag>,
  }[server]

  const canWeb = !isDesktop && api.apiConfigured() && valid && !busy

  return (
    <section>
      <PageHeader title="PDF 생성" sub="생성 전 필수 항목을 확인하고 PDF를 만듭니다. 만든 파일은 1시간 동안 내려받을 수 있습니다." />
      <Grid>
        <Card size="wide" title="생성 전 검수">
          <Row end={valid ? <StatusTag tone="ok">확인</StatusTag> : <Button variant="alt" href={href('create')}>고치러 가기</Button>}>
            기본 정보 입력{valid && pages ? ` · 약 ${pages.toLocaleString()}쪽` : ''}
          </Row>
          <Row end={<span className="tiny">{valid ? periodLabel(settings) + ' · ' : ''}{labelOf('paper', settings.paper)} · {labelOf('lang', settings.lang)} · {themeName(settings)}{settings.holidays ? ' · 공휴일' : ''}</span>}>
            고른 설정
          </Row>
          {!isDesktop && <Row end={serverRow}>PDF 만드는 서버</Row>}
          {isDesktop && <Row end={<StatusTag tone="ok">데스크톱 앱</StatusTag>}>실행 환경</Row>}

          {server === 'waking' && <Notice>무료 서버가 쉬고 있어서 깨우는 중입니다. 15분 넘게 아무도 쓰지 않으면 잠들어서, 처음 한 번은 1분쯤 걸릴 수 있습니다.</Notice>}
          {server === 'down' && (
            <Notice tone="error">서버에 연결하지 못했습니다. 무료 서버가 깨어나는 데 1분쯤 걸릴 수 있으니, 1분 뒤 이 화면을 새로고침해 주세요.</Notice>
          )}
          {server === 'none' && !isDesktop && <Notice stage={5}>서버 주소가 아직 연결되지 않았습니다.</Notice>}

          {isDesktop ? (
            <ButtonLine><Button disabled={desktopBusy || !valid} onClick={runDesktop}>이 설정으로 PDF 만들기</Button></ButtonLine>
          ) : (
            <ButtonLine>
              <Button disabled={!canWeb} onClick={() => gen.start(settings)}>
                {busy ? '만드는 중…' : gen.phase === 'succeeded' ? '이 설정으로 다시 만들기' : 'PDF 만들기'}
              </Button>
            </ButtonLine>
          )}
          {log && <pre className="tiny" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg)', padding: 10, borderRadius: 9 }}>{log}</pre>}
        </Card>

        <Card tabletFull title="진행 상태">
          {gen.phase === 'idle' ? (
            <p className="tiny">'PDF 만들기'를 누르면 여기에 진행 상황이 보입니다.</p>
          ) : (
            <>
              {STEPS.map((st) => {
                const [tone, text] = gen.phase === 'failed' ? ['wait', '—'] : stepTone(st, gen.phase)
                return <Row key={st.key} end={<StatusTag tone={tone}>{text}</StatusTag>}>{st.label}</Row>
              })}
              {busy && <ProgressBar label="PDF 만드는 중" />}
              {gen.phase === 'waking' && <p className="tiny">서버를 깨우는 중입니다. 화면을 닫지 말고 기다려 주세요.</p>}
            </>
          )}
        </Card>

        <div ref={resultRef} className="full-span" />
        {gen.phase === 'failed' && (
          <Card size="full" title="만들지 못했습니다">
            <Notice tone="error">{gen.error?.message || 'PDF 생성에 실패했습니다.'} 고른 설정은 그대로 남아 있습니다.</Notice>
            <ButtonLine>
              <Button disabled={!canWeb} onClick={() => gen.start(settings)}>다시 시도</Button>
              <Button variant="alt" onClick={gen.reset}>닫기</Button>
            </ButtonLine>
          </Card>
        )}

        {gen.phase === 'succeeded' && res && (
          <Card size="full" title="결과물">
            {stale && <Notice>지금 '플래너 만들기'의 설정이 이 파일을 만들 때와 다릅니다. 바뀐 설정으로 받으려면 '다시 만들기'를 눌러 주세요.</Notice>}
            <Row end={<b className="break">{res.fileName}</b>}>파일</Row>
            <Row end={<b>{res.pageCount.toLocaleString()}쪽</b>}>페이지</Row>
            <Row end={<span><b>{res.linkCount.toLocaleString()}개</b> · 깨진 링크 {res.brokenLinkCount}개 <StatusTag tone="ok">검사 통과</StatusTag></span>}>하이퍼링크</Row>
            <Row end={<b>{res.sizeMb} MB</b>}>크기</Row>
            {gen.job?.expiresAt && <Row end={<b>{fmtTime(gen.job.expiresAt)}까지</b>}>내려받기 가능</Row>}
            <ButtonLine>
              <Button href={api.downloadUrl(gen.id)} target="_blank" rel="noopener">PDF 내려받기</Button>
              <Button variant="alt" onClick={gen.reset}>결과 지우기</Button>
            </ButtonLine>
            <Notice>아이폰·아이패드: PDF가 열리면 아래 공유(□↑) 버튼 → 'GoodNotes'를 고르면 바로 굿노트로 들어갑니다.</Notice>
          </Card>
        )}
      </Grid>
    </section>
  )
}
