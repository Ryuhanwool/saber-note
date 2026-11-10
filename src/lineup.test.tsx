// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IDBFactory } from 'fake-indexeddb'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { createMemoryAuth } from './data/auth/memory'
import { getDataSource } from './data/registry'
import { createMemorySettings } from './data/settings/memory'
import type { AuthRepository } from './data/source'
import { dayKeyKST } from './domain/games/calendar'
import { buildLeague } from './domain/league'
import { virtualFanLineups } from './domain/lineup/fans'
import { pickCounts } from './domain/lineup/picks'
import { bullpenRoles } from './domain/lineup/roles'
import AuthProvider from './ui/auth/AuthProvider'
import CheerProvider from './ui/cheer/CheerProvider'
import CommunityProvider from './ui/community/CommunityProvider'
import LineupProvider from './ui/lineup/LineupProvider'
import MarketProvider from './ui/market/MarketProvider'
import SettingsProvider from './ui/settings/SettingsProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

window.scrollTo = () => {}
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}

const source = getDataSource('demo')
const today = buildLeague(await source.loadDay!(dayKeyKST(new Date())))
const basis = buildLeague(await source.loadDay!('2026-11-10'))
const roles = bullpenRoles(basis)
const catchers = today.hitters.filter((h) => h.raw.pos === 'C')
const closers = today.pitchers.filter((p) => roles.get(p.id) === 'CL')
const fanPicks = pickCounts(virtualFanLineups(basis, roles), null)

/** 앱이 여는 그대로 (커뮤니티·응원방·마켓·라인업은 브라우저 저장소), 계정만 메모리 */
function renderApp(path: string, auth: AuthRepository = createMemoryAuth({ iterations: 1_000 })) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsProvider store={createMemorySettings({ decorations: false })}>
        <LeagueProvider>
          <AuthProvider repository={auth}>
            <CommunityProvider>
              <CheerProvider>
                <MarketProvider>
                  <LineupProvider>
                    <App />
                  </LineupProvider>
                </MarketProvider>
              </CheerProvider>
            </CommunityProvider>
          </AuthProvider>
        </LeagueProvider>
      </SettingsProvider>
    </MemoryRouter>,
  )
  return auth
}

type User = ReturnType<typeof userEvent.setup>
const slot = (name: RegExp) => screen.findByRole('button', { name })
const dialog = async (title: string) => within(await screen.findByRole('dialog', { name: title }))
async function pickInto(user: User, slotLabel: string, playerName: string) {
  await user.click(await slot(new RegExp(`^${slotLabel}`)))
  const d = await dialog(`${slotLabel} 고르기`)
  await user.click(d.getByRole('button', { name: new RegExp(`^${playerName}`) }))
}

afterEach(cleanup)
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  sessionStorage.clear()
})

describe('나만의 라인업 화면', () => {
  it('자리를 누르면 그 포지션 선수만 뜨고(이름·팀·예상 가치·WAR), 고르면 야구장에 이름과 타순이 보인다', async () => {
    const user = userEvent.setup()
    renderApp('/lineup')
    await user.click(await slot(/^포수 — 비어 있음/))
    const d = await dialog('포수 고르기')
    const rows = d.getAllByRole('button').filter((b) => b.className.includes('pick-row'))
    expect(rows).toHaveLength(catchers.length)
    expect(rows[0].textContent).toMatch(/WAR/)
    expect(rows[0].textContent).toMatch(/억|만 원/)
    const c = catchers[0]
    await user.click(d.getByRole('button', { name: new RegExp(`^${c.name}`) }))
    expect(await slot(new RegExp(`^포수: ${c.name}, 1번 타자`))).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('지명타자는 모든 타자 중에서 고르고, 이미 다른 자리에 넣은 선수는 고를 수 없다', async () => {
    const user = userEvent.setup()
    renderApp('/lineup')
    const c = catchers[0]
    await pickInto(user, '포수', c.name)
    await user.click(await slot(/^지명타자/))
    const d = await dialog('지명타자 고르기')
    const rows = d.getAllByRole('button').filter((b) => b.className.includes('pick-row'))
    expect(rows).toHaveLength(today.hitters.length)
    const dup = d.getByRole('button', { name: new RegExp(`^${c.name}`) }) as HTMLButtonElement
    expect(dup.disabled).toBe(true)
    expect(dup.textContent).toContain('포수 자리에 있어요')
  })

  it('마무리 투수 목록은 마무리만, 세이브가 많은 순으로 세이브를 보여 준다', async () => {
    const user = userEvent.setup()
    renderApp('/lineup')
    await user.click(await slot(/^마무리 투수/))
    const d = await dialog('마무리 투수 고르기')
    const rows = d.getAllByRole('button').filter((b) => b.className.includes('pick-row'))
    const want = [...closers].sort((a, b) => (b.raw.SV! - a.raw.SV!) || 0)
    expect(rows).toHaveLength(6)
    const svs = rows.map((r) => Number(/세이브 (\d+)/.exec(r.textContent!)![1]))
    expect(svs).toEqual([...svs].sort((a, b) => b - a))
    for (const p of want) expect(d.getByRole('button', { name: new RegExp(`^${p.name}`) })).toBeTruthy()
    await user.keyboard('{Escape}')
    await user.click(await slot(/^중간 투수/))
    const m = await dialog('중간 투수 고르기')
    expect(m.getAllByText(/^홀드 \d+$/)).toHaveLength(6)
  })

  it('합계(총 예상 가치·총 WAR)와 「실제 연봉과 무관합니다.」, 타순 ▲▼', async () => {
    const user = userEvent.setup()
    renderApp('/lineup')
    await pickInto(user, '포수', catchers[0].name)
    const ss = today.hitters.find((h) => h.raw.pos === 'SS')!
    await pickInto(user, '유격수', ss.name)
    const total = within(screen.getByRole('region', { name: '라인업 합계' }))
    expect(total.getByText((catchers[0].m.WAR + ss.m.WAR).toFixed(2))).toBeTruthy()
    expect(total.getByText('2 / 12')).toBeTruthy()
    expect(screen.getByText('실제 연봉과 무관합니다.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: `${ss.name} 타순 올리기` }))
    expect(await slot(new RegExp(`^유격수: ${ss.name}, 1번 타자`))).toBeTruthy()
    expect(await slot(new RegExp(`^포수: ${catchers[0].name}, 2번 타자`))).toBeTruthy()
  })

  it('로그인 없이는 저장되지 않고 로그인 화면으로 간다. 로그인하면 고르던 라인업으로 돌아와 저장되고, 새로고침해도 남는다', async () => {
    const user = userEvent.setup()
    const auth = renderApp('/lineup')
    await pickInto(user, '포수', catchers[1].name)
    await user.click(await screen.findByRole('button', { name: '저장' }))
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeTruthy()
    await user.click(await screen.findByRole('button', { name: '데모 계정으로 체험하기' }))
    expect(await slot(new RegExp(`^포수: ${catchers[1].name}`))).toBeTruthy()
    await user.click(await screen.findByRole('button', { name: '저장' }))
    expect(await screen.findByText('저장했어요. 포지션별 픽 순위에 바로 반영돼요.')).toBeTruthy()
    // 새로고침: 같은 브라우저 저장소로 다시 연다
    cleanup()
    renderApp('/lineup', auth)
    expect(await slot(new RegExp(`^포수: ${catchers[1].name}, 1번 타자`))).toBeTruthy()
  })

  it('「비우기」는 고른 선수를 모두 빼고, 저장해야 저장된 라인업도 비워진다', async () => {
    const user = userEvent.setup()
    const auth = createMemoryAuth({ iterations: 1_000 })
    await auth.signInDemo()
    renderApp('/lineup', auth)
    await pickInto(user, '포수', catchers[0].name)
    await user.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByText(/저장했어요/)
    await user.click(screen.getByRole('button', { name: '비우기' }))
    expect(await slot(/^포수 — 비어 있음/)).toBeTruthy()
    expect(screen.getByText('비웠어요. 저장하면 저장된 라인업도 비워져요.')).toBeTruthy()
  })

  it('시연 데이터 초기화 후 라인업이 비워진다', async () => {
    const user = userEvent.setup()
    const auth = createMemoryAuth({ iterations: 1_000 })
    await auth.signInDemo()
    renderApp('/lineup', auth)
    await pickInto(user, '포수', catchers[0].name)
    await user.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByText(/저장했어요/)
    await user.click(await screen.findByRole('button', { name: '시연 데이터 초기화' }))
    const confirm = within(screen.getByRole('alertdialog', { name: '초기화 확인' }))
    await user.click(confirm.getByRole('button', { name: '초기화' }))
    await waitFor(async () => expect(await slot(/^포수 — 비어 있음/)).toBeTruthy())
    cleanup()
    renderApp('/lineup', auth)
    expect(await slot(/^포수 — 비어 있음/)).toBeTruthy()
  })
})

describe('포지션별 픽 순위 화면', () => {
  const pickRow = async (name: string) => (await within(await screen.findByRole('tabpanel', { name: '포수 픽 순위' })).findByRole('link', { name })).closest('tr')!

  it('포지션 탭 12개, 「가상 팬 300명 + 내 라인업 기준」, 순위·선수·팀·픽 수·픽률, 마무리는 세이브·중간은 홀드', async () => {
    const user = userEvent.setup()
    renderApp('/lineup?tab=picks')
    const tabs = within(await screen.findByRole('tablist', { name: '포지션' })).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['포수', '1루수', '2루수', '3루수', '유격수', '좌익수', '중견수', '우익수', '지명타자', '선발 투수', '중간 투수', '마무리 투수'])
    expect(screen.getByText('가상 팬 300명 + 내 라인업 기준')).toBeTruthy()
    const table = within(screen.getByRole('table'))
    expect(table.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['순위', '선수', '팀', '픽 수', '픽률'])
    expect(table.getAllByRole('row')).toHaveLength(1 + catchers.length)
    await user.click(screen.getByRole('tab', { name: '마무리 투수' }))
    const cl = within(screen.getByRole('table'))
    expect(cl.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['순위', '선수', '팀', '픽 수', '픽률', '세이브'])
    expect(cl.getAllByRole('row')).toHaveLength(1 + 6)
    await user.click(screen.getByRole('tab', { name: '중간 투수' }))
    expect(within(screen.getByRole('table')).getAllByRole('columnheader').at(-1)!.textContent).toBe('홀드')
    await user.click(screen.getByRole('tab', { name: '선발 투수' }))
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(1 + 10)
  })

  it('내 라인업을 저장하면 그 선수 픽 수가 1 늘고 「내 픽」으로 표시, 바꾸면 이전 선수는 1 줄어든다', async () => {
    const user = userEvent.setup()
    const auth = createMemoryAuth({ iterations: 1_000 })
    await auth.signInDemo()
    renderApp('/lineup', auth)
    const [x, y] = catchers
    const base = (id: string) => fanPicks.counts.C.get(id as never) ?? 0
    await pickInto(user, '포수', x.name)
    await user.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByText(/저장했어요/)
    await user.click(screen.getByRole('tab', { name: '포지션별 픽 순위' }))
    let row = await pickRow(x.name)
    expect(within(row).getAllByRole('cell')[2].textContent).toBe(String(base(x.id) + 1))
    expect(within(row).getByText('내 픽')).toBeTruthy()
    // 바꾸기
    await user.click(screen.getByRole('tab', { name: '내 라인업' }))
    await pickInto(user, '포수', y.name)
    await user.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByText(/저장했어요/)
    await user.click(screen.getByRole('tab', { name: '포지션별 픽 순위' }))
    row = await pickRow(x.name)
    expect(within(row).getAllByRole('cell')[2].textContent).toBe(String(base(x.id)))
    expect(within(row).queryByText('내 픽')).toBeNull()
    const rowY = await pickRow(y.name)
    expect(within(rowY).getAllByRole('cell')[2].textContent).toBe(String(base(y.id) + 1))
  })

  it('선수 이름을 누르면 선수 카드로 간다', async () => {
    const user = userEvent.setup()
    renderApp('/lineup?tab=picks&pos=CL')
    const first = (await within(await screen.findByRole('tabpanel', { name: '마무리 투수 픽 순위' })).findAllByRole('link'))[0]
    const name = first.textContent!
    await user.click(first)
    expect(await screen.findByRole('heading', { level: 1, name })).toBeTruthy()
  })
})

