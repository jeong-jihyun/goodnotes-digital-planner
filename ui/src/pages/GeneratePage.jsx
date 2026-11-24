import React, { useState } from 'react'
import StageNotice from '../components/StageNotice.jsx'

// 1단계에서는 기존 생성 흐름(Electron 데스크톱 경로)을 그대로 옮겨 둔다.
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
      <h1>PDF 생성</h1>
      <p className="sub">생성 전 필수 항목을 확인하고 PDF를 만듭니다.</p>
      <div className="grid">
        <div className="card wide">
          <h3>생성 전 검수</h3>
          <div className="row">기본 정보 입력 <span className="tag wait">3단계</span></div>
          <div className="row">디자인 옵션 선택 <span className="tag wait">4단계</span></div>
          <div className="row">웹 생성 엔진 연결 <span className="tag wait">6단계</span></div>
          <div className="row">실행 환경 <span className={`tag${isDesktop ? '' : ' wait'}`}>{isDesktop ? '데스크톱 앱' : '웹 브라우저'}</span></div>
          {isDesktop ? (
            <div className="btnline"><button className="btn" disabled={busy} onClick={runDesktop}>기본 설정으로 PDF 만들기</button></div>
          ) : (
            <StageNotice stage={6}>웹 브라우저에서는 아직 PDF를 만들 수 없습니다. 버튼을 일부러 두지 않았습니다.</StageNotice>
          )}
          {log && <pre className="tiny" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg)', padding: 10, borderRadius: 9 }}>{log}</pre>}
        </div>
        <div className="card t-full">
          <h3>결과물 정보</h3>
          <div className="metric">생성 전</div>
          <div className="tiny">실제 결과(페이지 수·링크 검증·파일 크기)는 생성 후 표시됩니다.</div>
        </div>
      </div>
    </section>
  )
}
