import React from 'react'
import { href } from '../hooks/useHashRoute.js'
import StageNotice from '../components/StageNotice.jsx'

export default function PreviewPage() {
  return (
    <section>
      <h1>디자인 미리보기</h1>
      <p className="sub">선택한 설정을 바탕으로 구성된 화면을 미리 확인합니다.</p>
      <div className="grid">
        <div className="card half">
          <h3>미리보기 화면</h3>
          <div className="preview">
            <div className="paper">
              <b>SAMPLE · 월간 페이지</b>
              <div style={{ height: 1, background: '#eee', margin: '12px 0' }} />
              <div className="papergrid">{Array.from({ length: 31 }, (_, i) => <i key={i}>{i + 1}</i>)}</div>
              <small>MONTHLY OVERVIEW · NOTES · GOALS</small>
            </div>
          </div>
        </div>
        <div className="card half">
          <h3>미리보기 옵션</h3>
          <StageNotice stage={4}>테마별 샘플 미리보기가 들어갈 자리입니다. 지금 보이는 그림은 고정 샘플입니다.</StageNotice>
          <div className="btnline"><a className="btn" href={href('generate')}>생성 단계로 이동</a></div>
        </div>
      </div>
    </section>
  )
}
