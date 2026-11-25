import React from 'react'
import { href } from '../hooks/useHashRoute.js'
import { usePlannerSettings } from '../hooks/usePlannerSettings.jsx'
import { OPTIONS, LIMITS, labelOf, periodLabel, periodRange, daysBetween } from '../domain/settings.js'
import { SelectField } from '../components/Field.jsx'
import MultiChoice from '../components/MultiChoice.jsx'
import { THEMES } from '../domain/themes.js'
import PageHeader from '../components/PageHeader.jsx'
import Card, { Grid } from '../components/Card.jsx'
import Button, { ButtonLine } from '../components/Button.jsx'
import Row from '../components/Row.jsx'
import StatusTag from '../components/StatusTag.jsx'
import Notice from '../components/Notice.jsx'
import NumberField from '../components/NumberField.jsx'
import ChoiceGroup from '../components/ChoiceGroup.jsx'
import ToggleOption from '../components/ToggleOption.jsx'
import ThemePicker from '../components/ThemeCard.jsx'
import { useToast } from '../components/Toast.jsx'

const STEPS = ['기본 설정', '미리보기', '결과물 생성', '상품 등록']

const PAPER_HINT = {
  'tablet-landscape': '아이패드를 가로로 놓고 쓰는 모양 (기존 상품과 같은 규격)',
  'goodnotes-portrait': '아이패드를 세로로 들고 쓰는 모양',
  'a4-portrait': 'A4 종이로 인쇄하기 좋은 세로 모양',
}
const DAILY_HINT = {
  'plan-todo': '왼쪽 일정, 오른쪽 할 일 줄',
  timetable: '왼쪽 06~23시 시간표, 오른쪽 할 일 체크 + 메모',
  lined: '한 쪽 전체 줄노트',
}
const LINK_HINT = {
  full: '월간 → 주간 → 일간을 눌러서 이동하고, 다시 월간으로 돌아올 수 있어요',
  monthly: '오른쪽 탭과 월 이동만 돼요. 날짜를 눌러도 이동하지 않아요',
}

function dailyDesc(s, errors) {
  if (errors.year || errors.months || errors.startMonth) return '하루를 한 쪽에'
  const { start, end } = periodRange(s.year, s.startMonth, s.months)
  return `하루를 한 쪽에 (기간 ${daysBetween(start, end)}쪽)`
}

export default function CreatePage() {
  const { settings: s, set, reset, errors, valid, pages, savedAt } = usePlannerSettings()
  const toast = useToast()
  const errorCount = Object.keys(errors).length
  // 주간·일간을 둘 다 끄면 '전체 연결'과 '월간 이동만'의 차이가 없어진다 → 미리 알려 준다
  const linkNoEffect = s.linkScope === 'full' && !s.weekly && !s.daily

  return (
    <section>
      <PageHeader title="플래너 만들기" sub="새 작업의 조건을 입력합니다. 바꾼 값은 이 기기에 바로 저장되고, '설정 요약'에 즉시 반영됩니다." />
      <Grid>
        <Card size="wide" title="작업 기본 정보">
          <h4 className="form-sec">📅 기간</h4>
          <div className="formgrid">
            <NumberField label="시작 연도" unit="년" min={LIMITS.year.min} max={LIMITS.year.max}
              value={s.year} onChange={(v) => set('year', v)} hint="2000~2100" error={errors.year} />
            <SelectField label="시작 달" value={s.startMonth} onChange={(v) => set('startMonth', Number(v))}
              options={OPTIONS.startMonth} hint="학기·회계연도에 맞춰 시작할 수 있어요" error={errors.startMonth} />
            <NumberField label="기간" unit="개월" min={LIMITS.months.min} max={LIMITS.months.max}
              value={s.months} onChange={(v) => set('months', v)} hint="1~18개월" error={errors.months} />
          </div>
          {!errors.year && !errors.months && !errors.startMonth && (
            <p className="field-hint choice-hint">📅 {periodLabel(s)} ({s.months}개월)</p>
          )}
          <h4 className="form-sec">🎨 모양</h4>
          <ChoiceGroup label="한 주 시작" value={s.weekStart} onChange={(v) => set('weekStart', v)} options={OPTIONS.weekStart} />
          <ChoiceGroup label="언어" value={s.lang} onChange={(v) => set('lang', v)} options={OPTIONS.lang} />
          <ChoiceGroup label="용지 모양" value={s.paper} onChange={(v) => set('paper', v)} options={OPTIONS.paper} />
          <p className="field-hint choice-hint">{PAPER_HINT[s.paper]}</p>
          <ThemePicker value={s.theme} onChange={(v) => set('theme', v)} />

          <h4 className="form-sec">📄 구성</h4>
          <div className="field">
            <span className="label">플래너 구성</span>
            <ToggleOption label="주간 페이지" desc="한 주를 한 쪽에" checked={s.weekly} onChange={(v) => set('weekly', v)} />
            <ToggleOption label="일간 페이지" desc={dailyDesc(s, errors)} checked={s.daily} onChange={(v) => set('daily', v)} />
            <ToggleOption label="한국 공휴일 표시"
              desc={s.lang === 'en' ? '빨간 날짜 + 영어 이름, 토요일 파랑·일요일 빨강' : '빨간 날짜 + 이름(대체공휴일 포함), 토요일 파랑·일요일 빨강'}
              checked={s.holidays} onChange={(v) => set('holidays', v)} />
          </div>
          {s.daily && (
            <>
              <ChoiceGroup label="일간 속지" value={s.dailyLayout} onChange={(v) => set('dailyLayout', v)} options={OPTIONS.dailyLayout} />
              <p className="field-hint choice-hint">{DAILY_HINT[s.dailyLayout]}</p>
            </>
          )}

          <MultiChoice label="추가 페이지" value={s.extras} onChange={(v) => set('extras', v)} options={OPTIONS.extras}
            hint="달마다 붙는 페이지는 그 달 월간 페이지 바로 뒤에 들어가고, 월간 페이지 위쪽 버튼으로 바로 갈 수 있어요" />

          <NumberField label="노트 페이지 수" unit="쪽" min={LIMITS.notes.min} max={LIMITS.notes.max}
            value={s.notes} onChange={(v) => set('notes', v)} hint="1~50쪽" error={errors.notes} />
          <ChoiceGroup label="노트 속지" value={s.noteStyle} onChange={(v) => set('noteStyle', v)} options={OPTIONS.noteStyle} />

          <h4 className="form-sec">🔗 링크</h4>
          <ChoiceGroup label="하이퍼링크" value={s.linkScope} onChange={(v) => set('linkScope', v)} options={OPTIONS.linkScope} />
          <p className="field-hint choice-hint">{LINK_HINT[s.linkScope]}</p>
          {linkNoEffect && <Notice>주간·일간 페이지를 모두 껐기 때문에 '전체 연결'과 '월간 이동만'의 결과가 같습니다.</Notice>}

          {errorCount > 0 && <Notice tone="error">고칠 칸이 {errorCount}개 있습니다. 빨간 글씨를 확인해 주세요. 고치기 전까지는 마지막으로 올바른 설정이 저장돼 있습니다.</Notice>}
          <ButtonLine>
            {/* 잘못된 칸이 있으면 이동 대신 안내 (눌러도 아무 일 없는 버튼이 되지 않게) */}
            <Button href={valid ? href('preview') : undefined} className={valid ? '' : 'is-disabled'}
              onClick={valid ? undefined : () => toast('먼저 빨간 칸을 고쳐 주세요')}
              aria-disabled={!valid || undefined}>다음 단계 · 미리보기</Button>
            <Button variant="alt" onClick={() => { reset(); toast('기본값으로 되돌렸습니다') }}>기본값으로</Button>
          </ButtonLine>
        </Card>

        <Card tabletFull title="설정 요약">
          <Row end={errors.year || errors.months || errors.startMonth ? <StatusTag tone="error">확인 필요</StatusTag> : <b>{periodLabel(s)} · {s.months}개월</b>}>기간</Row>
          <Row end={<b>{labelOf('weekStart', s.weekStart)}</b>}>한 주 시작</Row>
          <Row end={<b>{labelOf('lang', s.lang)}</b>}>언어</Row>
          <Row end={<b>{labelOf('paper', s.paper)}</b>}>용지</Row>
          <Row end={<b>{THEMES.find((t) => t.id === s.theme)?.name}</b>}>테마</Row>
          <Row end={<b>{[s.weekly && '주간', s.daily && '일간'].filter(Boolean).join(' · ') || '연간·월간만'}</b>}>구성</Row>
          <Row end={<b>{labelOf('linkScope', s.linkScope)}</b>}>하이퍼링크</Row>
          <Row end={<b>{s.holidays ? '표시' : '안 함'}</b>}>공휴일</Row>
          <Row end={<b>{s.extras.length ? OPTIONS.extras.filter((o) => s.extras.includes(o.value)).map((o) => o.label).join(' · ') : '없음'}</b>}>추가 페이지</Row>
          <Row end={<b>{[s.daily && labelOf('dailyLayout', s.dailyLayout), labelOf('noteStyle', s.noteStyle) + ' 노트'].filter(Boolean).join(' · ')}</b>}>속지</Row>
          <Row end={errors.notes ? <StatusTag tone="error">확인 필요</StatusTag> : <b>{s.notes}쪽</b>}>노트</Row>
          <Row end={pages ? <b>약 {pages.toLocaleString()}쪽</b> : <StatusTag tone="error">입력 확인</StatusTag>}>예상 페이지 수</Row>
          <p className="tiny">예상 쪽수는 생성 후 실제 결과로 확정됩니다.{savedAt && valid ? ' · 이 기기에 저장됨' : ''}</p>
        </Card>

        <Card size="full" title="진행 단계">
          {STEPS.map((st, i) => (
            <Row key={st} end={i === 0 ? <StatusTag tone="info">현재</StatusTag> : <StatusTag tone="wait">{i === 1 ? '다음' : '대기'}</StatusTag>}>
              0{i + 1} · {st}
            </Row>
          ))}
        </Card>
      </Grid>
    </section>
  )
}
