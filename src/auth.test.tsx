// @vitest-environment jsdom
// 화면 15·16. 로그인·회원가입 (시연용): 상단 메뉴, 데모 계정, 가입 검사·팀 테마, 로그인이 필요한 동작의 안내와 돌아오기,
// 닉네임 표시, Web Crypto를 쓸 수 없는 접속 안내, 시연 데이터 초기화의 계정 선택
import 'fake-indexeddb/auto'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { openDemoReset } from './testing/reset'
import { openWriteBox } from './testing/write'
import { IDBFactory } from 'fake-indexeddb'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { seedStars } from './data/seedPlayers'
import App from './App'
import { findEnabledButton } from './testing/buttons'
import { createMemoryAuth } from './data/auth/memory'
import { createBrowserCommunity } from './data/community/browser'
import { getDataSource } from './data/registry'
import { createMemorySettings } from './data/settings/memory'
import type { AuthRepository, SettingsStore } from './data/source'
import AuthProvider from './ui/auth/AuthProvider'
import CheerProvider from './ui/cheer/CheerProvider'
import CommunityProvider from './ui/community/CommunityProvider'
import MarketProvider from './ui/market/MarketProvider'
import SettingsProvider from './ui/settings/SettingsProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

window.scrollTo = () => {}
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}

const ds = await getDataSource('demo').load()
const slugger = seedStars(ds).sluggers[0]
const enc = encodeURIComponent
const TEAM = ds.hitters[0].team // 한빛 수달스 → 남색·금색

/** 앱이 여는 그대로 (커뮤니티·응원방·마켓은 브라우저 저장소), 계정만 메모리 (해시 반복을 줄인다) */
function renderApp(path: string, opts: { auth?: AuthRepository; settings?: SettingsStore } = {}) {
  const auth = opts.auth ?? createMemoryAuth({ iterations: 1_000 })
  render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsProvider store={opts.settings ?? createMemorySettings({ decorations: false })}>
        <LeagueProvider>
          <AuthProvider repository={auth}>
            <CommunityProvider>
              <CheerProvider>
                <MarketProvider>
                  <App />
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
const demoLogin = async (user: User) => user.click(await screen.findByRole('button', { name: '데모 계정으로 체험하기' }))
const loginHeading = () => screen.findByRole('heading', { name: '로그인' })

afterEach(cleanup)
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  sessionStorage.clear()
})

describe('상단 메뉴와 데모 계정', () => {
  it('로그아웃 상태면 「로그인」, 데모 계정으로 로그인하면 닉네임과 「로그아웃」', async () => {
    const user = userEvent.setup()
    renderApp('/')
    // 머리줄(빠른 메뉴)의 「로그인」 (홈 프로필 줄에도 「로그인」이 있다)
    const header = within(await screen.findByRole('group', { name: '빠른 메뉴' }))
    await user.click(await header.findByRole('link', { name: '로그인' }))
    expect(await loginHeading()).toBeTruthy()
    expect(screen.getByRole('note').textContent).toMatch(/시연용 로그인이에요.*실제 서비스 수준의 보안은 아니에요/)
    await demoLogin(user)
    const menu = within(await screen.findByLabelText('로그인 상태'))
    expect(menu.getByText('체험팬')).toBeTruthy()
    // 로그아웃은 엠블럼 동그라미를 눌러 여는 내 프로필 창 안에 있다
    await user.click(menu.getByRole('button', { name: /내 프로필 메뉴/ }))
    await user.click(within(await screen.findByRole('dialog', { name: '내 프로필' })).getByRole('button', { name: '로그아웃' }))
    expect(await header.findByRole('link', { name: '로그인' })).toBeTruthy()
  })

  it('로그인 없이도 선수 카드·비교·미니게임은 쓸 수 있다', async () => {
    renderApp(`/player/${enc(slugger.id)}`)
    expect(await screen.findByRole('heading', { name: slugger.name })).toBeTruthy()
    cleanup()
    renderApp('/compare')
    expect(await screen.findByRole('link', { name: '로그인' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '로그인' })).toBeNull()
    cleanup()
    renderApp('/games')
    expect(await screen.findByText(/지표 업다운/)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '로그인' })).toBeNull()
  })
})

describe('회원가입', () => {
  const fill = async (user: User, nickname: string, pw: string, confirm = pw) => {
    await user.type(await screen.findByLabelText(/^닉네임/), nickname)
    await user.type(screen.getByLabelText(/^비밀번호6자 이상/), pw) // 비밀번호 칸 (안내 문구가 이름에 붙는다)
    await user.type(screen.getByLabelText('비밀번호 확인'), confirm)
  }

  it('닉네임 작성 제한·예약어, 비밀번호 확인을 검사한다', async () => {
    const user = userEvent.setup()
    renderApp('/signup')
    await fill(user, '씨발홈런', 'secret123')
    await user.click(screen.getByRole('button', { name: '가입하기' }))
    expect(await screen.findByText('닉네임에 쓸 수 없는 표현이 있어요. 다른 닉네임을 골라 주세요.')).toBeTruthy()
    await user.clear(screen.getByLabelText(/^닉네임/))
    await user.type(screen.getByLabelText(/^닉네임/), '체험팬')
    await user.click(screen.getByRole('button', { name: '가입하기' }))
    expect(await screen.findByText('이 닉네임은 쓸 수 없어요. 다른 닉네임을 골라 주세요.')).toBeTruthy()
    await user.clear(screen.getByLabelText(/^닉네임/))
    await user.type(screen.getByLabelText(/^닉네임/), '수달팬')
    await user.clear(screen.getByLabelText('비밀번호 확인'))
    await user.type(screen.getByLabelText('비밀번호 확인'), 'secret999')
    await user.click(screen.getByRole('button', { name: '가입하기' }))
    expect(await screen.findByText('비밀번호 확인이 맞지 않아요.')).toBeTruthy()
  })

  it('가입하면 바로 로그인되고, 응원 팀을 고르면 그 팀 컬러 테마가 적용된다', async () => {
    const user = userEvent.setup()
    const settings = createMemorySettings({ decorations: false })
    renderApp('/signup', { settings })
    await fill(user, '수달팬', 'secret123')
    const team = screen.getByRole('combobox', { name: /^응원 팀/ })
    expect(within(team).getByRole('option', { name: `${TEAM} · 남색·금색 테마` })).toBeTruthy()
    await user.selectOptions(team, TEAM)
    await user.click(screen.getByRole('button', { name: '가입하기' }))
    expect(within(await screen.findByLabelText('로그인 상태')).getByText('수달팬')).toBeTruthy()
    await waitFor(async () => expect((await settings.load()).themeId).toBe('navy-gold'))
  })

  it('이 브라우저에서 이미 쓰는 닉네임(대소문자 무시)은 가입할 수 없다', async () => {
    const user = userEvent.setup()
    const auth = createMemoryAuth({ iterations: 1_000 })
    await auth.signUp({ nickname: 'SaberFan', password: 'secret123', team: null })
    await auth.signOut()
    renderApp('/signup', { auth })
    await fill(user, 'saberfan', 'secret123')
    await user.click(screen.getByRole('button', { name: '가입하기' }))
    expect(await screen.findByText('이미 이 브라우저에서 쓰고 있는 닉네임이에요.')).toBeTruthy()
  })
})

describe('로그인', () => {
  it('닉네임·비밀번호가 틀리면 알려 주고, 맞으면 돌아갈 화면(next)으로 간다', async () => {
    const user = userEvent.setup()
    const auth = createMemoryAuth({ iterations: 1_000 })
    await auth.signUp({ nickname: '수달팬', password: 'secret123', team: null })
    await auth.signOut()
    renderApp('/login?next=%2Fmarket', { auth })
    expect(await screen.findByText('로그인하면 하던 화면으로 돌아가요.')).toBeTruthy()
    await user.type(screen.getByLabelText('닉네임'), '수달팬')
    await user.type(screen.getByLabelText('비밀번호'), 'wrong-pass')
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByText('닉네임이나 비밀번호가 맞지 않아요.')).toBeTruthy()
    await user.clear(screen.getByLabelText('비밀번호'))
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByRole('link', { name: /^장바구니/ })).toBeTruthy() // 마켓으로 돌아왔다
  })

  it('다른 사이트 주소로는 돌아가지 않는다', async () => {
    const user = userEvent.setup()
    renderApp('/login?next=%2F%2Fevil.example')
    await demoLogin(user)
    expect(await screen.findByLabelText('로그인 상태')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '로그인' })).toBeNull()
  })

  it('Web Crypto를 쓸 수 없는 접속이면 가입·로그인 대신 접속 주소를 안내한다', async () => {
    renderApp('/login', { auth: createMemoryAuth({ subtle: null }) })
    expect((await screen.findByRole('alert')).textContent).toContain('localhost나 https 주소로 접속해 주세요.')
    expect(screen.queryByRole('button', { name: '로그인' })).toBeNull()
    expect(screen.queryByRole('button', { name: '데모 계정으로 체험하기' })).toBeNull()
    cleanup()
    renderApp('/signup', { auth: createMemoryAuth({ subtle: null }) })
    expect((await screen.findByRole('alert')).textContent).toContain('localhost나 https 주소로 접속해 주세요.')
    expect(screen.queryByRole('button', { name: '가입하기' })).toBeNull()
  })
})

describe('로그인이 필요한 동작: 로그인 화면으로 안내하고, 로그인 뒤 하던 화면으로 돌아온다', () => {
  it('커뮤니티 글쓰기: 써 두던 글이 남아 있고, 올리면 닉네임이 보인다', async () => {
    const user = userEvent.setup()
    renderApp('/community')
    await user.type(await openWriteBox(user), '로그인 전에 쓴 글')
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    await loginHeading()
    await demoLogin(user)
    const box = await screen.findByRole('textbox', { name: '글 내용' })
    await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe('로그인 전에 쓴 글'))
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    const feed = within(screen.getByLabelText('글 목록'))
    const mine = await feed.findByText('로그인 전에 쓴 글')
    expect(within(mine.closest('article')!).getByText('체험팬')).toBeTruthy()
  })

  it('좋아요·신고도 로그인이 필요하다', async () => {
    const user = userEvent.setup()
    renderApp('/community')
    const feed = within(await screen.findByLabelText('글 목록'))
    await user.click((await feed.findAllByRole('button', { name: /^좋아요/ }))[0])
    expect(await loginHeading()).toBeTruthy()
  })

  it('응원하기 · 응원 메시지', async () => {
    const user = userEvent.setup()
    renderApp(`/player/${enc(slugger.id)}/cheer`)
    await user.click(await screen.findByRole('button', { name: '📣 응원하기' }))
    await loginHeading()
    await demoLogin(user)
    await user.click(await screen.findByRole('button', { name: '📣 응원하기' }))
    expect(await screen.findByRole('button', { name: '오늘 응원했어요' })).toBeTruthy()
    await user.type(await openWriteBox(user, '응원 메시지 내용'), '화이팅!')
    await user.click(screen.getByRole('button', { name: '응원 남기기' }))
    const list = within(screen.getByLabelText('응원 메시지 목록'))
    const card = (await list.findByText('화이팅!')).closest('article')!
    expect(within(card).getByText('체험팬')).toBeTruthy()
  })

  it('판매글 쓰기: 로그인한 뒤 판매글 쓰기 화면으로 (주소로 바로 들어와도 로그인 안내)', async () => {
    const user = userEvent.setup()
    renderApp('/market/fan')
    await user.click(await screen.findByRole('button', { name: '판매글 쓰기' }))
    await loginHeading()
    await demoLogin(user)
    expect(await screen.findByRole('heading', { name: '판매글 쓰기' })).toBeTruthy()
    cleanup()
    renderApp('/market/sell')
    expect(await loginHeading()).toBeTruthy()
  })

  it('주문하기: 장바구니는 로그인 없이 담고, 주문할 때 로그인한 뒤 주문 확인으로 돌아온다', async () => {
    const user = userEvent.setup()
    renderApp('/market')
    // 담기 버튼은 마켓 저장소가 열려야 활성이 된다 (바로 누르면 바쁠 때 클릭이 사라지던 원인)
    await user.click(await findEnabledButton(`${TEAM} 모자 담기`))
    await user.click(await screen.findByRole('link', { name: '장바구니 1' }))
    await user.click(await screen.findByRole('button', { name: '주문 확인으로' }))
    await user.click(await screen.findByRole('button', { name: /주문하기 \(시연\)$/ }))
    await loginHeading()
    await demoLogin(user)
    await user.click(await screen.findByRole('button', { name: /주문하기 \(시연\)$/ }))
    expect(await screen.findByRole('status', { name: '주문 완료' })).toBeTruthy()
  })
})

describe('로그인 기능 전에 쓴 글과 시연 데이터 초기화', () => {
  it('예전 글은 「익명 팬」으로 보이고 지울 수 없다', async () => {
    const old = createBrowserCommunity() // 예전처럼 익명 사용자로 쓴 글
    await old.create({ text: '로그인 기능 전에 쓴 글', players: [], masked: false, caution: false, files: [] })
    old.close()
    const user = userEvent.setup()
    renderApp('/login?next=%2Fcommunity')
    await demoLogin(user)
    const card = (await within(await screen.findByLabelText('글 목록')).findByText('로그인 기능 전에 쓴 글')).closest('article')!
    expect(within(card).getByText('익명 팬')).toBeTruthy()
    expect(within(card).queryByRole('button', { name: '삭제' })).toBeNull()
  })

  it('초기화: 기본은 계정이 남고, 「가입한 계정도 모두 지우기」를 고르면 계정도 지우고 로그아웃', async () => {
    const user = userEvent.setup()
    const auth = createMemoryAuth({ iterations: 1_000 })
    await auth.signUp({ nickname: '수달팬', password: 'secret123', team: null })
    renderApp('/community', { auth })
    const reset = async (withAccounts: boolean) => {
      await user.click((await openDemoReset(user)).getByRole('button', { name: '시연 데이터 초기화' }))
      const dialog = within(screen.getByRole('alertdialog', { name: '초기화 확인' }))
      if (withAccounts) await user.click(dialog.getByRole('checkbox', { name: /가입한 계정도 모두 지우기/ }))
      await user.click(dialog.getByRole('button', { name: '초기화' }))
    }
    await reset(false)
    expect(await screen.findByText('시연 데이터를 처음 상태로 되돌렸어요. 계정은 그대로예요.')).toBeTruthy()
    expect(within(screen.getByLabelText('로그인 상태')).getByText('수달팬')).toBeTruthy()
    await reset(true)
    expect(await screen.findByRole('link', { name: '로그인' })).toBeTruthy()
    expect(await auth.nicknames()).toEqual(['체험팬'])
  })
})
