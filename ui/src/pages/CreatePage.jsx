import React from 'react'
import { href } from '../hooks/useHashRoute.js'
import StageNotice from '../components/StageNotice.jsx'

const STEPS = ['기본 설정', '미리보기', '결과물 생성', '상품 등록']

export default function CreatePage() {
  return (
    <section>
      <h1>플래너 만들기</h1>
      <p className="sub">새 작업의 조건을 입력합니다. 변경한 값은 화면에서 즉시 확인할 수 있습니다.</p>
      <div className="grid">
        <div className="card wide">
          <h3>작업 기본 정보</h3>
          <StageNotice stage={3}>연도·주 시작 요일·언어·테마·주간/일간·노트 페이지(1~50) 입력과 검증이 들어갈 자리입니다.</StageNotice>
          <div className="btnline"><a className="btn alt" href={href('preview')}>다음 단계</a></div>
        </div>
        <div className="card">
          <h3>진행 단계</h3>
          {STEPS.map((s, i) => (
            <div className="row" key={s}>0{i + 1} · {s} {i === 0 ? <span className="tag">현재</span> : <span className="tiny">{i === 1 ? '다음' : '대기'}</span>}</div>
          ))}
        </div>
      </div>
    </section>
  )
}
