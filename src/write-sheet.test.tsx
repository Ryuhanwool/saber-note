// @vitest-environment jsdom
// 글쓰기 칸 → 「글쓰기」 버튼 + 아래에서 올라오는 창 (커뮤니티·응원방). 작성 제한·로그인 안내·쓰던 글 보관은 그대로
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

window.scrollTo = () => {}
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}
const league = buildLeague(await getDataSource('demo').load())
const star = league.hitters[0]

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


afterEach(cleanup)
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  sessionStorage.clear()
  localStorage.clear()
})
const loggedIn = async () => {
  const auth = createMemoryAuth({ iterations: 1_000 })
  await auth.signInDemo()
  return auth
}
const sheet = (name: string) => screen.queryByRole('dialog', { name })

describe('커뮤니티 글쓰기 창', () => {
  it('처음엔 글 칸 대신 「글쓰기」 버튼. 누르면 아래에서 창이 올라오고 글 칸에 초점, Esc로 닫으면 버튼으로 돌아간다', async () => {
    const user = userEvent.setup()
    renderApp('/community', await loggedIn())
    const btn = await screen.findByRole('button', { name: '글쓰기' })
    expect(screen.queryByRole('textbox', { name: '글 내용' })).toBeNull()
    expect(sheet('글쓰기')).toBeNull()
    await user.click(btn)
    const box = await screen.findByRole('textbox', { name: '글 내용' })
    expect(sheet('글쓰기')).toBeTruthy()
    expect(document.activeElement).toBe(box)
    await user.keyboard('{Escape}')
    expect(sheet('글쓰기')).toBeNull()
    expect(document.activeElement).toBe(btn)
  })

  it('닫았다 다시 열어도 쓰던 글이 남아 있다', async () => {
    const user = userEvent.setup()
    renderApp('/community', await loggedIn())
    await user.click(await screen.findByRole('button', { name: '글쓰기' }))
    await user.type(await screen.findByRole('textbox', { name: '글 내용' }), '쓰다 만 글')
    await user.click(within(sheet('글쓰기')!).getByRole('button', { name: '닫기' }))
    await user.click(screen.getByRole('button', { name: '글쓰기' }))
    expect((screen.getByRole('textbox', { name: '글 내용' }) as HTMLTextAreaElement).value).toBe('쓰다 만 글')
  })

  it('작성 제한은 그대로: 막히는 글은 창 안에서 이유를 보여 주고, 올리면 창이 닫히고 「게시했어요.」', async () => {
    const user = userEvent.setup()
    renderApp('/community', await loggedIn())
    await user.click(await screen.findByRole('button', { name: '글쓰기' }))
    const box = await screen.findByRole('textbox', { name: '글 내용' })
    await user.type(box, '너 ㅂㅅ이냐')
    const dlg = within(sheet('글쓰기')!)
    expect((dlg.getByRole('button', { name: '게시하기' }) as HTMLButtonElement).disabled).toBe(true)
    expect(dlg.getByText(/인신공격/)).toBeTruthy()
    await user.clear(box)
    await user.type(box, '오늘 경기 재밌었다')
    await user.click(dlg.getByRole('button', { name: '게시하기' }))
    await waitFor(() => expect(sheet('글쓰기')).toBeNull())
    expect(await screen.findByText('게시했어요.')).toBeTruthy()
    expect(within(screen.getByLabelText('글 목록')).getByText('오늘 경기 재밌었다')).toBeTruthy()
  })

  it('로그인 안 했으면 로그인 화면으로 갔다가, 돌아오면 창이 열린 채로 쓰던 글이 다시 채워진다', async () => {
    const user = userEvent.setup()
    renderApp('/community')
    await user.click(await screen.findByRole('button', { name: '글쓰기' }))
    await user.type(await screen.findByRole('textbox', { name: '글 내용' }), '로그인 전에 쓴 글')
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    await user.click(await screen.findByRole('button', { name: '데모 계정으로 체험하기' }))
    expect(await screen.findByRole('dialog', { name: '글쓰기' })).toBeTruthy()
    expect(((await screen.findByRole('textbox', { name: '글 내용' })) as HTMLTextAreaElement).value).toBe('로그인 전에 쓴 글')
  })

  it('선수 카드의 「이 선수 글쓰기」로 오면 창이 열리고 그 선수 태그가 달려 있다', async () => {
    const user = userEvent.setup()
    renderApp(`/community?write=${encodeURIComponent(star.id)}`, await loggedIn())
    expect(await screen.findByRole('dialog', { name: '글쓰기' })).toBeTruthy()
    expect(await screen.findByRole('button', { name: `${star.name} 태그 빼기` })).toBeTruthy()
    void user
  })
})

describe('응원방 응원 메시지 쓰기 창', () => {
  it('「응원 메시지 쓰기」를 누르면 창에서 쓰고, 남기면 창이 닫히고 「응원을 남겼어요.」', async () => {
    const user = userEvent.setup()
    renderApp(`/player/${encodeURIComponent(star.id)}/cheer`, await loggedIn())
    const btn = await screen.findByRole('button', { name: '응원 메시지 쓰기' })
    expect(screen.queryByRole('textbox', { name: '응원 메시지 내용' })).toBeNull()
    await user.click(btn)
    await user.type(await screen.findByRole('textbox', { name: '응원 메시지 내용' }), '오늘도 화이팅!')
    await user.click(within(sheet('응원 메시지 쓰기')!).getByRole('button', { name: '응원 남기기' }))
    await waitFor(() => expect(sheet('응원 메시지 쓰기')).toBeNull())
    expect(await screen.findByText('응원을 남겼어요.')).toBeTruthy()
    expect(within(screen.getByLabelText('응원 메시지 목록')).getByText('오늘도 화이팅!')).toBeTruthy()
  })
})
