import React from 'react'
import { href } from '../hooks/useHashRoute.js'
import PageHeader from '../components/PageHeader.jsx'
import Card, { Grid } from '../components/Card.jsx'
import Button, { ButtonLine } from '../components/Button.jsx'
import Notice from '../components/Notice.jsx'

export default function PreviewPage() {
  return (
    <section>
      <PageHeader title="디자인 미리보기" sub="선택한 설정을 바탕으로 구성된 화면을 미리 확인합니다." />
      <Grid>
        <Card size="half" title="미리보기 화면">
          <div className="preview">
            <div className="paper">
              <b>SAMPLE · 월간 페이지</b>
              <div style={{ height: 1, background: '#eee', margin: '12px 0' }} />
              <div className="papergrid">{Array.from({ length: 31 }, (_, i) => <i key={i}>{i + 1}</i>)}</div>
              <small>MONTHLY OVERVIEW · NOTES · GOALS</small>
            </div>
          </div>
        </Card>
        <Card size="half" title="미리보기 옵션">
          <Notice stage={4}>테마별 샘플 미리보기가 들어갈 자리입니다. 지금 보이는 그림은 고정 샘플입니다.</Notice>
          <ButtonLine><Button href={href('generate')}>생성 단계로 이동</Button></ButtonLine>
        </Card>
      </Grid>
    </section>
  )
}
