import React from 'react'
import { href } from '../hooks/useHashRoute.js'
import StageNotice from '../components/StageNotice.jsx'

export default function DashboardPage() {
  return (
    <section>
      <h1>오늘의 작업 대시보드</h1>
      <p className="sub">플래너 스튜디오에서 플래너 PDF 제작부터 상품 등록 준비까지 한곳에서 관리합니다.</p>
      <div className="grid">
        <div className="card"><div className="tiny">테마</div><div className="metric">4종</div><div className="tiny">navy · sage · rose · mono</div></div>
        <div className="card"><div className="tiny">설정 항목</div><div className="metric">7개</div><div className="tiny">연도·요일·언어·테마·주간·일간·노트</div></div>
        <div className="card"><div className="tiny">최근 생성</div><div className="metric">—</div><div className="tiny">생성 이력은 9단계에서 표시</div></div>
        <div className="card wide">
          <h3>최근 작업</h3>
          <div className="row">아직 만든 플래너가 없습니다 <span className="tag wait">대기</span></div>
          <div className="btnline">
            <a className="btn" href={href('create')}>새 작업 시작</a>
            <a className="btn alt" href={href('settings')}>작업 이력</a>
          </div>
          <StageNotice stage={9}>최근 작업 목록은 이 기기에 저장된 생성 이력으로 채워집니다.</StageNotice>
        </div>
        <div className="card">
          <h3>빠른 시작</h3>
          <div className="row">설정 입력 <a className="btn alt" href={href('create')}>열기</a></div>
          <div className="row">미리보기 <a className="btn alt" href={href('preview')}>열기</a></div>
          <div className="row">생성 및 검수 <a className="btn alt" href={href('generate')}>열기</a></div>
        </div>
      </div>
    </section>
  )
}
