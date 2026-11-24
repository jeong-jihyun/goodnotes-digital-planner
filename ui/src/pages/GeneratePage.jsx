import React, { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card, { Grid, Metric } from '../components/Card.jsx'
import Button, { ButtonLine } from '../components/Button.jsx'
import Row from '../components/Row.jsx'
import StatusTag from '../components/StatusTag.jsx'
import Notice from '../components/Notice.jsx'

// 기존 생성 흐름(Electron 데스크톱 경로)을 유지한다.
// 웹 브라우저에서 실제 PDF를 만드는 기능은 5~6단계(API 서버)에서 연결한다.
const DEFAULT = { year: 2027, weekStart: 'monday', lang: 'ko', theme: 'navy', weekly: true, daily: true, notes: 5 }

export default function GeneratePage() {
  const [log, setLog] = useState('')
  const [busy, setBusy] = useState(false)
  const isDesktop = typeof window !== 'undefined' && !!window.planner

  async function runDesktop() {
    setBusy(true); setLog('생성 중...')
    try { setLog(JSON.stringify(await window.planner.generate(DEFAULT), null, 2)) }
    catch (e) { setLog('오류: ' + e.message) }
    setBusy(false)
  }

  return (
    <section>
      <PageHeader title="PDF 생성" sub="생성 전 필수 항목을 확인하고 PDF를 만듭니다." />
      <Grid>
        <Card size="wide" title="생성 전 검수">
          <Row end={<StatusTag tone="wait">3단계</StatusTag>}>기본 정보 입력</Row>
          <Row end={<StatusTag tone="wait">4단계</StatusTag>}>디자인 옵션 선택</Row>
          <Row end={<StatusTag tone="wait">6단계</StatusTag>}>웹 생성 엔진 연결</Row>
          <Row end={<StatusTag tone={isDesktop ? 'ok' : 'wait'}>{isDesktop ? '데스크톱 앱' : '웹 브라우저'}</StatusTag>}>실행 환경</Row>
          {isDesktop ? (
            <ButtonLine><Button disabled={busy} onClick={runDesktop}>기본 설정으로 PDF 만들기</Button></ButtonLine>
          ) : (
            <Notice stage={6}>웹 브라우저에서는 아직 PDF를 만들 수 없습니다. 버튼을 일부러 두지 않았습니다.</Notice>
          )}
          {log && <pre className="tiny" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg)', padding: 10, borderRadius: 9 }}>{log}</pre>}
        </Card>
        <Card tabletFull title="결과물 정보">
          <Metric label="상태" value="생성 전" hint="실제 결과(페이지 수·링크 검증·파일 크기)는 생성 후 표시됩니다." />
        </Card>
      </Grid>
    </section>
  )
}
