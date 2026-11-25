import React, { useEffect, useState } from 'react'
import { href } from '../hooks/useHashRoute.js'
import { usePlannerSettings } from '../hooks/usePlannerSettings.jsx'
import { usePreview } from '../hooks/usePreview.js'
import { labelOf, periodLabel } from '../domain/settings.js'
import { THEMES } from '../domain/themes.js'
import { apiConfigured } from '../services/plannerApi.js'
import PageHeader from '../components/PageHeader.jsx'
import Card, { Grid } from '../components/Card.jsx'
import Button, { ButtonLine } from '../components/Button.jsx'
import Row from '../components/Row.jsx'
import StatusTag from '../components/StatusTag.jsx'
import Notice from '../components/Notice.jsx'
import ProgressBar from '../components/ProgressBar.jsx'

export default function PreviewPage() {
  const { settings: s, valid, pages } = usePlannerSettings()
  const isDesktop = typeof window !== 'undefined' && !!window.planner
  const canUse = valid && apiConfigured() && !isDesktop
  const pv = usePreview(s, canUse)
  const [kind, setKind] = useState('cover')
  const list = pv.data?.pages || []
  const current = list.find((p) => p.kind === kind) || list[0]
  // 설정이 바뀌어 선택했던 쪽(예: 일간)이 없어지면 첫 쪽으로
  useEffect(() => { if (list.length && !list.some((p) => p.kind === kind)) setKind(list[0].kind) }, [list, kind])
  const busy = pv.phase === 'loading' || pv.phase === 'waking'
  const [zoom, setZoom] = useState(false)
  // 크게 보기: Esc 로 닫기, 열려 있는 동안 뒤 화면 스크롤 막기
  useEffect(() => {
    if (!zoom) return
    const onKey = (e) => e.key === 'Escape' && setZoom(false)
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [zoom])

  return (
    <section>
      <PageHeader title="디자인 미리보기" sub="지금 고른 설정으로 실제 PDF를 만들어 대표 쪽을 그림으로 보여 줍니다. 보이는 그대로 PDF가 만들어집니다." />
      <Grid>
        <Card size="wide" title="미리보기 화면">
          {!valid && <Notice tone="error">'플래너 만들기'에 고칠 칸이 있어 미리보기를 만들 수 없습니다. <a href={href('create')}>고치러 가기</a></Notice>}
          {isDesktop && <Notice>데스크톱 앱에서는 미리보기 대신 바로 PDF를 만들어 확인해 주세요.</Notice>}
          {!apiConfigured() && !isDesktop && <Notice>서버 주소가 연결되지 않아 미리보기를 만들 수 없습니다.</Notice>}

          {list.length > 0 && (
            <div className="pv-tabs" role="tablist" aria-label="미리볼 쪽">
              {list.map((p) => (
                <button key={p.kind} type="button" role="tab" aria-selected={current?.kind === p.kind}
                  className={`choice${current?.kind === p.kind ? ' selected' : ''}`} onClick={() => setKind(p.kind)}>
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <div className={`preview pv-stage${busy ? ' is-busy' : ''}`}>
            {current ? (
              <figure className="pv-figure">
                <button type="button" className="pv-zoom-btn" onClick={() => setZoom(true)} aria-label={`${current.label} 크게 보기`}>
                  <img src={current.image} alt={`${current.label} 미리보기 (${current.pageNumber}쪽)`}
                    width={current.width} height={current.height} className={current.height > current.width ? 'portrait' : ''} />
                </button>
                <figcaption className="tiny">실제 PDF {current.pageNumber}쪽 · 전체 {pv.data.pageCount.toLocaleString()}쪽 · 그림을 누르면 크게 보기</figcaption>
              </figure>
            ) : (
              <div className="pv-empty tiny">{busy ? '미리보기를 만드는 중…' : canUse ? '미리보기를 준비하고 있습니다.' : '미리보기를 만들 수 없습니다.'}</div>
            )}
          </div>
          {busy && <div style={{ marginTop: 10 }}><ProgressBar label="미리보기 만드는 중" /></div>}
          {pv.phase === 'waking' && <Notice>무료 서버가 쉬고 있어서 깨우는 중입니다. 처음 한 번은 1분쯤 걸릴 수 있습니다.</Notice>}
          {pv.phase === 'failed' && (
            <Notice tone="error">{pv.error} <button type="button" className="linklike" onClick={pv.reload}>다시 시도</button></Notice>
          )}
        </Card>

        {zoom && current && (
          <div className="pv-overlay" role="dialog" aria-modal="true" aria-label={`${current.label} 크게 보기`} onClick={() => setZoom(false)}>
            <button type="button" className="pv-close" onClick={() => setZoom(false)}>닫기 ✕</button>
            <div className="pv-overlay-scroll" onClick={(e) => e.stopPropagation()}>
              <img src={current.image} alt={`${current.label} 크게 보기`} />
            </div>
            <p className="pv-overlay-hint">두 손가락으로 벌리면 더 크게 볼 수 있어요</p>
          </div>
        )}

        <Card tabletFull title="미리보기 옵션">
          <Row end={<b>{valid ? periodLabel(s) : '—'}</b>}>기간</Row>
          <Row end={<b>{labelOf('paper', s.paper)}</b>}>용지</Row>
          <Row end={<b>{labelOf('lang', s.lang)}</b>}>언어</Row>
          <Row end={<b>{THEMES.find((t) => t.id === s.theme)?.name}</b>}>테마</Row>
          <Row end={<b>{s.holidays ? '표시' : '안 함'}</b>}>공휴일</Row>
          <Row end={pv.data ? <b>{pv.data.pageCount.toLocaleString()}쪽</b> : pages ? <span className="tiny">약 {pages.toLocaleString()}쪽</span> : <StatusTag tone="error">입력 확인</StatusTag>}>페이지</Row>
          <ButtonLine>
            <Button href={href('generate')} className={valid ? '' : 'is-disabled'}>이 설정으로 PDF 만들기</Button>
            <Button variant="alt" href={href('create')}>설정 바꾸기</Button>
          </ButtonLine>
        </Card>
      </Grid>
    </section>
  )
}
