import React from 'react'
import StageNotice from '../components/StageNotice.jsx'

export default function SettingsPage() {
  return (
    <section>
      <h1>설정 및 이력</h1>
      <p className="sub">작업 이력과 기본 환경 설정을 관리합니다.</p>
      <div className="grid">
        <div className="card wide">
          <h3>작업 이력</h3>
          <div className="row">아직 기록이 없습니다 <span className="tiny">—</span></div>
          <StageNotice stage={9}>이력은 로그인 없이 이 기기 브라우저에만 저장됩니다.</StageNotice>
        </div>
        <div className="card">
          <h3>환경 설정</h3>
          <StageNotice stage={9}>기본 언어 등 환경 설정이 들어갈 자리입니다.</StageNotice>
        </div>
      </div>
    </section>
  )
}
