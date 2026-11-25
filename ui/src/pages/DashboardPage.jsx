import React from 'react'
import { href, navigate } from '../hooks/useHashRoute.js'
import { useHistory } from '../hooks/useHistory.jsx'
import { DEFAULTS, sanitize, periodLabel } from '../domain/settings.js'
import { THEMES, FONTS, themeName } from '../domain/themes.js'
import { when } from './ListingPage.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card, { Grid, Metric } from '../components/Card.jsx'
import Button, { ButtonLine } from '../components/Button.jsx'
import Row from '../components/Row.jsx'
import StatusTag from '../components/StatusTag.jsx'

export default function DashboardPage() {
  const { history, presets, setSelectedId } = useHistory()
  const last = history[0]
  return (
    <section>
      <PageHeader title="오늘의 작업 대시보드" sub="플래너 스튜디오에서 플래너 PDF 제작부터 상품 등록 준비까지 한곳에서 관리합니다." />
      <Grid>
        <Card size="stat"><Metric label="테마" value={`${THEMES.length}종 + 내 색`} hint={`글꼴 ${FONTS.length}종 · 기간 1~18개월`} /></Card>
        <Card size="stat"><Metric label="만든 PDF" value={`${history.length}개`} hint={`자주 쓰는 설정 ${presets.length}개`} /></Card>
        <Card size="stat"><Metric label="최근 생성" value={last ? when(last.at) : '—'} hint={last ? `${last.pageCount?.toLocaleString()}쪽 · ${themeName(sanitize({ ...DEFAULTS, ...last.settings }))}` : '아직 없음'} /></Card>
        <Card size="wide" title="최근 작업">
          {history.length === 0 && <Row end={<StatusTag tone="wait">대기</StatusTag>}>아직 만든 플래너가 없습니다</Row>}
          {history.slice(0, 3).map((e) => (
            <Row key={e.id} end={e.copy
              ? <Button variant="alt" onClick={() => { setSelectedId(e.id); navigate('listing') }}>상품 문구</Button>
              : <StatusTag tone="ok">완료</StatusTag>}>
              <b>{when(e.at)}</b> <span className="tiny">{periodLabel(sanitize({ ...DEFAULTS, ...e.settings }))} · {e.pageCount?.toLocaleString()}쪽</span>
            </Row>
          ))}
          <ButtonLine>
            <Button href={href('create')}>새 작업 시작</Button>
            <Button variant="alt" href={href('settings')}>작업 이력</Button>
          </ButtonLine>
        </Card>
        <Card tabletFull title="빠른 시작">
          <Row end={<Button variant="alt" href={href('create')}>열기</Button>}>설정 입력</Row>
          <Row end={<Button variant="alt" href={href('preview')}>열기</Button>}>미리보기</Row>
          <Row end={<Button variant="alt" href={href('generate')}>열기</Button>}>생성 및 검수</Row>
          <Row end={<Button variant="alt" href={href('listing')}>열기</Button>}>상품 문구·이미지</Row>
        </Card>
      </Grid>
    </section>
  )
}
