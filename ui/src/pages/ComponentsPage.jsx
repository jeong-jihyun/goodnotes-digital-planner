import React, { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card, { Grid, Metric } from '../components/Card.jsx'
import Button, { ButtonLine } from '../components/Button.jsx'
import Row from '../components/Row.jsx'
import StatusTag from '../components/StatusTag.jsx'
import Notice from '../components/Notice.jsx'
import { SelectField, TextField } from '../components/Field.jsx'
import NumberField from '../components/NumberField.jsx'
import ChoiceGroup from '../components/ChoiceGroup.jsx'
import ToggleOption from '../components/ToggleOption.jsx'
import ThemePicker from '../components/ThemeCard.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { useToast } from '../components/Toast.jsx'

// 숨은 확인용 화면(#/components): 공통 부품을 한곳에 모아 모양·동작을 확인한다.
// 여기 값은 저장되지 않는다.
export default function ComponentsPage() {
  const toast = useToast()
  const [notes, setNotes] = useState(5)
  const [week, setWeek] = useState('monday')
  const [theme, setTheme] = useState('navy')
  const [weekly, setWeekly] = useState(true)
  const [lang, setLang] = useState('ko')
  const [text, setText] = useState('')
  const notesErr = Number.isNaN(notes) || notes < 1 || notes > 50 ? '1~50 사이 정수로 입력해 주세요' : ''
  return (
    <section>
      <PageHeader title="부품 모음" sub="2단계 공통 부품 확인용 화면입니다. 메뉴에는 없고 이 주소로만 열립니다. 입력값은 저장되지 않습니다." />
      <Grid>
        <Card size="stat" title={null}><Metric label="숫자 카드" value="4종" hint="Metric" /></Card>
        <Card size="stat"><Metric label="숫자 카드" value="7개" hint="Metric" /></Card>
        <Card size="stat"><Metric label="숫자 카드" value="—" hint="값 없음 표시" /></Card>

        <Card size="half" title="버튼">
          <ButtonLine>
            <Button onClick={() => toast('기본 버튼을 눌렀습니다')}>기본 버튼</Button>
            <Button variant="alt" onClick={() => toast('보조 버튼을 눌렀습니다')}>보조 버튼</Button>
            <Button disabled>사용 불가</Button>
          </ButtonLine>
        </Card>
        <Card size="half" title="상태 표시 · 줄">
          <Row end={<StatusTag tone="ok">완료</StatusTag>}>성공</Row>
          <Row end={<StatusTag tone="info">진행 중</StatusTag>}>진행</Row>
          <Row end={<StatusTag tone="wait">대기</StatusTag>}>대기</Row>
          <Row end={<StatusTag tone="warn">확인 필요</StatusTag>}>주의</Row>
          <Row end={<StatusTag tone="error">실패</StatusTag>}>오류</Row>
        </Card>

        <Card size="half" title="입력칸">
          <SelectField label="언어 (선택 상자)" value={lang} onChange={setLang}
            options={[{ value: 'ko', label: '한국어' }, { value: 'en', label: 'English' }]} />
          <NumberField label="노트 페이지 수" unit="쪽" min={1} max={50} value={notes} onChange={setNotes}
            hint="1~50 사이" error={notesErr} />
          <TextField label="글 입력" value={text} onChange={setText} placeholder="여기에 입력" hint="도움말 문구" />
        </Card>
        <Card size="half" title="고르기 · 스위치">
          <ChoiceGroup label="한 주 시작" value={week} onChange={setWeek}
            options={[{ value: 'monday', label: '월요일' }, { value: 'sunday', label: '일요일' }]} />
          <ToggleOption label="주간 페이지 포함" desc="한 주 단위 페이지" checked={weekly} onChange={setWeekly} />
          <ToggleOption label="꺼진 예시" checked={false} onChange={() => toast('예시 스위치입니다')} />
        </Card>

        <Card size="full" title="테마 카드">
          <ThemePicker value={theme} onChange={setTheme} />
        </Card>

        <Card size="half" title="진행 막대">
          <div className="tiny" style={{ marginBottom: 6 }}>진행률을 아는 경우 (60%)</div>
          <ProgressBar value={60} label="예시 진행률" />
          <div className="tiny" style={{ margin: '14px 0 6px' }}>진행률을 모르는 경우 (숫자 없이 움직임)</div>
          <ProgressBar label="생성 중" />
        </Card>
        <Card size="half" title="안내 상자">
          <Notice>기본 안내 문구입니다.</Notice>
          <Notice stage={6}>아직 없는 기능 안내</Notice>
          <Notice tone="success">완료 안내 문구입니다.</Notice>
          <Notice tone="error">오류 안내 문구입니다.</Notice>
        </Card>
      </Grid>
    </section>
  )
}
