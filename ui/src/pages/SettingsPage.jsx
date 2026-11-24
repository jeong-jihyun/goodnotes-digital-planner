import React from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card, { Grid } from '../components/Card.jsx'
import Row from '../components/Row.jsx'
import Notice from '../components/Notice.jsx'

export default function SettingsPage() {
  return (
    <section>
      <PageHeader title="설정 및 이력" sub="작업 이력과 기본 환경 설정을 관리합니다." />
      <Grid>
        <Card size="wide" title="작업 이력">
          <Row end={<span className="tiny">—</span>}>아직 기록이 없습니다</Row>
          <Notice stage={9}>이력은 로그인 없이 이 기기 브라우저에만 저장됩니다.</Notice>
        </Card>
        <Card tabletFull title="환경 설정">
          <Notice stage={9}>기본 언어 등 환경 설정이 들어갈 자리입니다.</Notice>
        </Card>
      </Grid>
    </section>
  )
}
