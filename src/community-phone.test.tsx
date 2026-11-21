// @vitest-environment jsdom
// 커뮤니티 휴대폰 폭: 오른쪽 칸 대신 피드 위 화제의 선수 한 줄, 작성 규칙은 글쓰기 창 안, 사진·영상 크게 보기
import 'fake-indexeddb/auto'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IDBFactory } from 'fake-indexeddb'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { createMemoryAuth } from './data/auth/memory'
import { createMemorySettings } from './data/settings/memory'
import type { AuthRepository } from './data/source'
import { createMemoryCommunity } from './data/community/memory'
import type { CommunityPost } from './data/types'
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


const realMatchMedia = window.matchMedia
const phone = (on: boolean) => {
  window.matchMedia = ((query: string) => ({ matches: on && query.includes('max-width: 720px'), media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
}
afterEach(() => {
  cleanup()
  window.matchMedia = realMatchMedia
})
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  sessionStorage.clear()
  localStorage.clear()
})

describe('커뮤니티 휴대폰 폭', () => {
  it('오른쪽 칸 대신 피드 위에 「많이 이야기된」·「응원 순위」 선수 이름 칩 한 줄. 칩을 누르면 그 선수 글만', async () => {
    phone(true)
    const user = userEvent.setup()
    renderApp('/community')
    const row = within(await screen.findByRole('region', { name: '이번 주 화제의 선수' }))
    expect(screen.queryByRole('complementary')).toBeNull()
    const talked = within(row.getByRole('group', { name: '이번 주 많이 이야기된 선수' }))
    const first = talked.getAllByRole('button')[0]
    const name = first.textContent!.replace(/\s*\d+개$/, '')
    await waitFor(() => expect(row.getByRole('group', { name: '이번 주 응원 순위' })).toBeTruthy(), { timeout: 3000 })
    expect(within(row.getByRole('group', { name: '이번 주 응원 순위' })).getAllByRole('link')[0].getAttribute('href')).toMatch(/\/cheer$/)
    await user.click(first)
    expect(await screen.findByRole('button', { name: `${name} 관련 글 ✕` })).toBeTruthy()
  })

  it('작성 규칙은 글쓰기 창 안에 있다', async () => {
    phone(true)
    const user = userEvent.setup()
    renderApp('/community')
    expect(screen.queryByRole('heading', { name: '작성 규칙' })).toBeNull()
    await user.click(await screen.findByRole('button', { name: '글쓰기' }))
    const dlg = within(await screen.findByRole('dialog', { name: '글쓰기' }))
    expect(dlg.getByRole('heading', { name: '작성 규칙' })).toBeTruthy()
    expect(dlg.getByText(/30초에 한 번/)).toBeTruthy()
  })

  it('넓은 화면에서는 지금처럼 오른쪽 칸(많이 이야기된 선수·응원 순위·작성 규칙), 칩 줄 없음', async () => {
    phone(false)
    renderApp('/community')
    const aside = within(await screen.findByRole('complementary'))
    expect(aside.getByRole('heading', { name: '이번 주 많이 이야기된 선수' })).toBeTruthy()
    expect(aside.getByRole('heading', { name: '작성 규칙' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: '이번 주 화제의 선수' })).toBeNull()
  })
})

describe('글의 사진·영상 크게 보기', () => {
  it('사진을 누르면 화면 가득 크게 보고, 「닫기」나 Esc로 닫으면 누른 사진으로 초점이 돌아간다', async () => {
    const user = userEvent.setup()
    const post: CommunityPost = {
      id: 'm1', authorId: 'x', authorName: '사진팬', text: '홈런 타구', players: [], media: [{ id: 'f1', kind: '사진', type: 'image/png', name: 'a.png' }],
      createdAt: Date.now() - 1000, likes: [], reports: [], masked: false, caution: false,
    }
    const repo = createMemoryCommunity({ posts: [post] })
    repo.mediaUrl = async () => 'blob:photo'
    render(
      <MemoryRouter initialEntries={['/community']}>
        <LeagueProvider>
          <CommunityProvider repository={repo}>
            <App />
          </CommunityProvider>
        </LeagueProvider>
      </MemoryRouter>,
    )
    const zoom = await screen.findByRole('button', { name: '사진 크게 보기' })
    await user.click(zoom)
    const box = within(screen.getByRole('dialog', { name: '사진 크게 보기' }))
    expect(box.getByRole('img', { name: '사진' }).getAttribute('src')).toBe('blob:photo')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '사진 크게 보기' })).toBeNull()
    expect(document.activeElement).toBe(zoom)
    await user.click(zoom)
    await user.click(within(screen.getByRole('dialog', { name: '사진 크게 보기' })).getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog', { name: '사진 크게 보기' })).toBeNull()
  })
})
