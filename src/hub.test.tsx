// @vitest-environment jsdom
// 홈 화면·메뉴 디자인: 아이콘 줄, 홈(프로필 줄·내 라인업 띠·카드 메뉴), 아래쪽 탭 바
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
import AuthProvider from './ui/auth/AuthProvider'
import CheerProvider from './ui/cheer/CheerProvider'
import CommunityProvider from './ui/community/CommunityProvider'
import ProfileProvider from './ui/hub/ProfileProvider'
import LineupProvider from './ui/lineup/LineupProvider'
import MarketProvider from './ui/market/MarketProvider'
import SettingsProvider from './ui/settings/SettingsProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

window.scrollTo = () => {}
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}

const today = buildLeague(await getDataSource('demo').loadDay!(dayKeyKST(new Date())))

/** 앱이 여는 그대로 (커뮤니티·응원방·마켓·라인업·프로필은 브라우저 저장소), 계정만 메모리 */
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

const quick = async () => within(await screen.findByRole('group', { name: '빠른 메뉴' }))

afterEach(cleanup)
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  sessionStorage.clear()
})

describe('아이콘 줄', () => {
  it('새 소식·선수 검색·화면 설정이 나란히 있고, 로그아웃 상태면 「로그인」', async () => {
    renderApp('/ranking')
    const q = await quick()
    await q.findByRole('button', { name: /^새 소식/ })
    expect(await q.findByRole('button', { name: '선수 검색' })).toBeTruthy()
    expect(q.getByRole('button', { name: '화면 설정' })).toBeTruthy()
    expect((await q.findByRole('link', { name: '로그인' })).getAttribute('href')).toBe('/login?next=%2Franking')
    expect(q.queryByRole('button', { name: '로그아웃' })).toBeNull()
    // 아이콘은 외부 이미지 없이 SVG
    expect(document.querySelector('header img')).toBeNull()
  })

  it('로그인했으면 로그아웃 아이콘. 누르면 로그아웃된다', async () => {
    const user = userEvent.setup()
    const auth = createMemoryAuth({ iterations: 1_000 })
    await auth.signInDemo()
    renderApp('/ranking', auth)
    const q = await quick()
    await user.click(await q.findByRole('button', { name: '로그아웃' }))
    expect(await q.findByRole('link', { name: '로그인' })).toBeTruthy()
  })

  it('선수 검색: 어느 화면에서나 검색 창을 띄우고, 고르면 선수 카드로 간다', async () => {
    const user = userEvent.setup()
    const target = today.hitters[3]
    renderApp('/market')
    await user.click(await (await quick()).findByRole('button', { name: '선수 검색' }))
    const box = await screen.findByRole('combobox', { name: '선수 이름 검색 (검색 창)' })
    expect(document.activeElement).toBe(box)
    await user.type(box, target.name)
    await user.click(await screen.findByRole('option', { name: new RegExp(target.name) }))
    expect(await screen.findByRole('heading', { level: 1, name: target.name })).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: '선수 검색' })).toBeNull()
  })

  it('새 소식: 다른 팬의 최근 글·판매글을 보여 주고, 열어 보면 점(새로 옴)이 꺼진다', async () => {
    const user = userEvent.setup()
    renderApp('/ranking')
    const q = await quick()
    const bell = await q.findByRole('button', { name: /새 소식 \(\d+개 새로 옴\)/ }, { timeout: 3000 })
    await user.click(bell)
    const pop = within(await screen.findByRole('dialog', { name: '새 소식' }))
    await waitFor(() => {
      expect(pop.getAllByText('커뮤니티 새 글').length).toBeGreaterThan(0)
      expect(pop.getAllByText('마켓 새 판매글').length).toBeGreaterThan(0)
    }, { timeout: 3000 })
    // 신고로 가려진 예시 글은 나오지 않는다
    expect(pop.queryByText(/demo-post-6/)).toBeNull()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(q.getByRole('button', { name: '새 소식' })).toBeTruthy())
    expect(document.activeElement).toBe(q.getByRole('button', { name: '새 소식' }))
  })

  it('새 소식의 판매글을 누르면 그 판매글로 간다', async () => {
    const user = userEvent.setup()
    renderApp('/ranking')
    await user.click(await (await quick()).findByRole('button', { name: /^새 소식/ }))
    const pop = within(await screen.findByRole('dialog', { name: '새 소식' }))
    // 마켓 저장소가 열려 판매글이 들어올 때까지 기다린다
    const link = await waitFor(() => {
      const a = pop.getAllByRole('link').find((x) => x.getAttribute('href')?.startsWith('/market/fan/'))
      if (!a) throw new Error('판매글 소식이 아직 없다')
      return a
    }, { timeout: 3000 })
    const title = link.querySelector('.news-text')!.textContent!.replace(/…$/, '')
    await user.click(link)
    expect((await screen.findByRole('heading', { level: 2, name: (n) => n.startsWith(title) }, { timeout: 3000 })).textContent).toContain(title)
  })
})
