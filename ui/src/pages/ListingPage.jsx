import React from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card, { Grid } from '../components/Card.jsx'
import Row from '../components/Row.jsx'
import StatusTag from '../components/StatusTag.jsx'
import Notice from '../components/Notice.jsx'

const CHECKS = ['대표 이미지 준비', '상품 설명 검토', '가격 및 라이선스 결정', '판매 채널 등록']

export default function ListingPage() {
  return (
    <section>
      <PageHeader title="상품 등록 관리" sub="판매 채널에 등록할 상품 정보를 작성하고 복사합니다." />
      <Grid>
        <Card size="wide" title="상품 정보 초안">
          <Notice stage={8}>엔진이 만든 상품명·설명·태그 초안(listing_copy)을 보여 주고 복사하는 자리입니다.</Notice>
        </Card>
        <Card tabletFull title="등록 체크리스트">
          {CHECKS.map((c) => <Row key={c} end={<StatusTag tone="wait">대기</StatusTag>}>{c}</Row>)}
          <Notice>판매 채널(Etsy 등) 자동 등록은 하지 않습니다. 문구·이미지 초안까지만 만듭니다.</Notice>
        </Card>
      </Grid>
    </section>
  )
}
