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
