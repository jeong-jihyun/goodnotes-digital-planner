import React from 'react'
import { href } from '../hooks/useHashRoute.js'
import PageHeader from '../components/PageHeader.jsx'
import Card, { Grid } from '../components/Card.jsx'
import Button, { ButtonLine } from '../components/Button.jsx'
import Row from '../components/Row.jsx'
import StatusTag from '../components/StatusTag.jsx'
import Notice from '../components/Notice.jsx'

const STEPS = ['기본 설정', '미리보기', '결과물 생성', '상품 등록']

export default function CreatePage() {
  return (
    <section>
      <PageHeader title="플래너 만들기" sub="새 작업의 조건을 입력합니다. 변경한 값은 화면에서 즉시 확인할 수 있습니다." />
      <Grid>
        <Card size="wide" title="작업 기본 정보">
          <Notice stage={3}>연도·주 시작 요일·언어·테마·주간/일간·노트 페이지(1~50) 입력과 검증이 들어갈 자리입니다.</Notice>
          <ButtonLine><Button variant="alt" href={href('preview')}>다음 단계</Button></ButtonLine>
        </Card>
        <Card tabletFull title="진행 단계">
          {STEPS.map((s, i) => (
            <Row key={s} end={i === 0 ? <StatusTag tone="info">현재</StatusTag> : <StatusTag tone="wait">{i === 1 ? '다음' : '대기'}</StatusTag>}>
              0{i + 1} · {s}
            </Row>
          ))}
        </Card>
      </Grid>
    </section>
  )
}
