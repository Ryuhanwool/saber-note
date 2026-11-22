// @vitest-environment jsdom
// 화면 위아래 다듬기: 시연 데이터 초기화는 화면 설정 창 맨 아래, 글 카드의 머리 줄은 앱 머리줄과 별개, 라인업 투수 줄
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
import { buildLeague } from './domain/league'
import AuthProvider from './ui/auth/AuthProvider'
import CheerProvider from './ui/cheer/CheerProvider'
import CommunityProvider from './ui/community/CommunityProvider'
import ProfileProvider from './ui/hub/ProfileProvider'
import LineupProvider from './ui/lineup/LineupProvider'
import MarketProvider from './ui/market/MarketProvider'
import SettingsProvider from './ui/settings/SettingsProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

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
                    <ProfileProvider>
                      <App />
                    </ProfileProvider>
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


window.scrollTo = () => {}
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}
const league = buildLeague(await getDataSource('demo').load())

afterEach(cleanup)
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  sessionStorage.clear()
  localStorage.clear()
})
const settings = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: '화면 설정' }))
  return within(await screen.findByRole('dialog', { name: '화면 설정' }))
}

describe('시연 데이터 초기화는 화면 설정 창 맨 아래', () => {
  for (const [name, path] of [['커뮤니티', '/community'], ['라인업', '/lineup'], ['응원방', `/player/${encodeURIComponent(league.hitters[0].id)}/cheer`]] as const) {
    it(`${name} 화면 맨 아래에는 초기화 카드가 없다`, async () => {
      renderApp(path)
      await screen.findByRole('button', { name: '화면 설정' })
      await waitFor(() => expect(document.querySelector('main')!.textContent!.length).toBeGreaterThan(50))
      expect(screen.queryByRole('region', { name: '시연 데이터 초기화' })).toBeNull()
      expect(screen.queryByRole('button', { name: '시연 데이터 초기화' })).toBeNull()
    })
  }

  it('톱니바퀴 창 맨 아래에 있고, 확인 창·「가입한 계정도 모두 지우기」·취소가 그대로 동작한다', async () => {
    const user = userEvent.setup()
    const auth = createMemoryAuth({ iterations: 1_000 })
    await auth.signUp({ nickname: '수달팬', password: 'secret123', team: null })
    renderApp('/community', auth)
    const panel = await settings(user)
    const reset = within(await panel.findByRole('region', { name: '시연 데이터 초기화' }))
    // 창 맨 아래 (다른 설정 묶음보다 뒤)
    const sections = screen.getByRole('dialog', { name: '화면 설정' }).querySelectorAll('fieldset, section')
    expect(sections[sections.length - 1].getAttribute('aria-label')).toBe('시연 데이터 초기화')
    await user.click(reset.getByRole('button', { name: '시연 데이터 초기화' }))
    const confirm = within(screen.getByRole('alertdialog', { name: '초기화 확인' }))
    expect(confirm.getByRole('checkbox', { name: /가입한 계정도 모두 지우기/ })).toBeTruthy()
    await user.click(confirm.getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('alertdialog', { name: '초기화 확인' })).toBeNull()
    // 계정도 지우기를 고르면 로그아웃되고 가입한 계정이 지워진다 (창 안 누름이라 설정 창은 닫히지 않는다)
    await user.click(reset.getByRole('button', { name: '시연 데이터 초기화' }))
    const c2 = within(screen.getByRole('alertdialog', { name: '초기화 확인' }))
    await user.click(c2.getByRole('checkbox', { name: /가입한 계정도 모두 지우기/ }))
    await user.click(c2.getByRole('button', { name: '초기화' }))
    expect(await screen.findByText('시연 데이터와 가입한 계정을 지웠어요. 로그아웃됐어요.')).toBeTruthy()
    expect(await auth.nicknames()).toEqual(['체험팬'])
  })
})

describe('글 카드 머리 줄 · 라인업 투수 줄', () => {
  it('글 카드의 글쓴이·시간 줄은 앱 머리줄(위에 붙는 줄)이 아니다', async () => {
    renderApp('/community')
    await screen.findAllByRole('article')
    const headers = [...document.querySelectorAll('header')]
    expect(headers.filter((h) => h.classList.contains('app-header'))).toHaveLength(1)
    expect(headers.filter((h) => h.closest('article')).every((h) => !h.classList.contains('app-header'))).toBe(true)
  })

  it('「투수는 타순이 없어요」 줄은 자리 이름과 선수를 한 덩어리로 (줄이 바뀌어도 「–」만 넘어가지 않게)', async () => {
    renderApp('/lineup')
    await screen.findByText('투수는 타순이 없어요')
    const items = [...document.querySelectorAll('.order-pitchers .op-item')].map((e) => e.textContent)
    expect(items).toEqual(['선발 투수 –', '중간 투수 –', '마무리 투수 –'])
  })
})
