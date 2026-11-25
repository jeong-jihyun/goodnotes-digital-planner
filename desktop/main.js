const { app, BrowserWindow, ipcMain } = require('electron')
const { execFile } = require('child_process')
const path = require('path')
const root = path.join(__dirname, '..')

// 화면에서 받은 설정을 Python 엔진 인자로 바꾼다. 허용된 값만 통과시킨다.
function toArgs(s) {
  const year = Number(s.year)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('연도 오류')
  if (!['monday', 'sunday'].includes(s.weekStart)) throw new Error('요일 오류')
  if (!['ko', 'en', 'ko-en'].includes(s.lang)) throw new Error('언어 오류')
  const paper = s.paper || 'tablet-landscape'
  if (!['tablet-landscape', 'goodnotes-portrait', 'a4-portrait'].includes(paper)) throw new Error('용지 오류')
  const links = s.linkScope || 'full'
  if (!['full', 'monthly'].includes(links)) throw new Error('링크 범위 오류')
  if (!['navy', 'sage', 'rose', 'mono', 'pastel', 'dark', 'vintage', 'terracotta', 'custom'].includes(s.theme)) throw new Error('테마 오류')
  const color = s.customColor || ''
  if (s.theme === 'custom' && !/^#[0-9A-Fa-f]{6}$/.test(color)) throw new Error('색 오류')
  const font = s.fontFamily || 'gothic'
  if (!['gothic', 'myeongjo', 'barun', 'squareround', 'pen'].includes(font)) throw new Error('글꼴 오류')
  const text = (v, n) => { const t = String(v || '').trim(); if ([...t].length > n) throw new Error('표지 글 오류'); return t }
  const title = text(s.title, 40), owner = text(s.owner, 30), motto = text(s.motto, 60)
  const notes = Number(s.notes)
  if (!Number.isInteger(notes) || notes < 0 || notes > 50) throw new Error('노트 수 오류')
  const a = ['-m', 'engine.cli', '--year', String(year), '--week-start', s.weekStart, '--lang', s.lang,
    '--theme', s.theme, '--notes', String(notes), '--paper', paper, '--links', links, '--out', path.join(app.getPath('documents'), 'planner_output')]
  if (!s.weekly) a.push('--no-weekly')
  if (!s.daily) a.push('--no-daily')
  // execFile 은 셸을 거치지 않으므로 표지 글은 그대로 인자로 넘겨도 안전하다
  a.push('--font-family', font)
  if (s.theme === 'custom') a.push('--custom-color', color)
  if (title) a.push('--title', title)
  if (owner) a.push('--owner', owner)
  if (motto) a.push('--motto', motto)
  return a
}

ipcMain.handle('planner:generate', (_e, s) => new Promise((resolve, reject) => {
  let args
  try { args = toArgs(s) } catch (e) { return reject(e) }
  execFile(process.platform === 'win32' ? 'python' : 'python3', args, { cwd: root }, (err, out, errout) => {
    if (err) reject(new Error(errout || err.message)); else resolve(JSON.parse(out))
  })
}))

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 760, height: 720,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true } })
  win.loadFile(path.join(root, 'ui', 'dist', 'index.html'))
})
app.on('window-all-closed', () => app.quit())
