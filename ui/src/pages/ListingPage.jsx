import React from 'react'
import StageNotice from '../components/StageNotice.jsx'

const CHECKS = ['대표 이미지 준비', '상품 설명 검토', '가격 및 라이선스 결정', '판매 채널 등록']

export default function ListingPage() {
  return (
    <section>
      <h1>상품 등록 관리</h1>
      <p className="sub">판매 채널에 등록할 상품 정보를 작성하고 복사합니다.</p>
      <div className="grid">
        <div className="card wide">
          <h3>상품 정보 초안</h3>
          <StageNotice stage={8}>엔진이 만든 상품명·설명·태그 초안(listing_copy)을 보여 주고 복사하는 자리입니다.</StageNotice>
        </div>
        <div className="card t-full">
          <h3>등록 체크리스트</h3>
          {CHECKS.map((c) => <div className="row" key={c}>{c} <span className="tag wait">대기</span></div>)}
          <div className="notice">판매 채널(Etsy 등) 자동 등록은 하지 않습니다. 문구·이미지 초안까지만 만듭니다.</div>
        </div>
      </div>
    </section>
  )
}
