import React from 'react'
import { href } from '../hooks/useHashRoute.js'
import PageHeader from '../components/PageHeader.jsx'
import Card, { Grid, Metric } from '../components/Card.jsx'
import Button, { ButtonLine } from '../components/Button.jsx'
import Row from '../components/Row.jsx'
import StatusTag from '../components/StatusTag.jsx'
import Notice from '../components/Notice.jsx'

export default function DashboardPage() {
  return (
    <section>
      <PageHeader title="오늘의 작업 대시보드" sub="플래너 스튜디오에서 플래너 PDF 제작부터 상품 등록 준비까지 한곳에서 관리합니다." />
      <Grid>
        <Card size="stat"><Metric label="테마" value="4종" hint="navy · sage · rose · mono" /></Card>
        <Card size="stat"><Metric label="설정 항목" value="7개" hint="연도·요일·언어·테마·주간·일간·노트" /></Card>
        <Card size="stat"><Metric label="최근 생성" value="—" hint="생성 이력은 9단계에서 표시" /></Card>
        <Card size="wide" title="최근 작업">
          <Row end={<StatusTag tone="wait">대기</StatusTag>}>아직 만든 플래너가 없습니다</Row>
          <ButtonLine>
            <Button href={href('create')}>새 작업 시작</Button>
            <Button variant="alt" href={href('settings')}>작업 이력</Button>
          </ButtonLine>
          <Notice stage={9}>최근 작업 목록은 이 기기에 저장된 생성 이력으로 채워집니다.</Notice>
        </Card>
        <Card tabletFull title="빠른 시작">
          <Row end={<Button variant="alt" href={href('create')}>열기</Button>}>설정 입력</Row>
          <Row end={<Button variant="alt" href={href('preview')}>열기</Button>}>미리보기</Row>
          <Row end={<Button variant="alt" href={href('generate')}>열기</Button>}>생성 및 검수</Row>
        </Card>
      </Grid>
    </section>
  )
}
