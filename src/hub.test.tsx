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
import { createBrowserLineup } from './data/lineup/browser'
import { DEMO_ACCOUNT_ID, DEMO_ACCOUNT_NICKNAME } from './data/types'
import { getDataSource } from './data/registry'
import { createMemorySettings } from './data/settings/memory'
import type { AuthRepository } from './data/source'
import { dayKeyKST, shiftDayKey } from './domain/games/calendar'
import { buildLeague } from './domain/league'
import { recentCount } from './domain/hub/news'
import { emptyLineup } from './domain/lineup/lineup'
import { teamsOf } from './domain/market/catalog'
import { movers, valueChangeLabel, valueRanking } from './domain/value/ranking'
import { formatWon } from './domain/value/value'
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
  localStorage.clear()
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

  it('로그인했으면 「로그인」 자리에 내 엠블럼 동그라미, 로그아웃 아이콘은 아이콘 줄에 없다', async () => {
    const auth = createMemoryAuth({ iterations: 1_000 })
    await auth.signInDemo()
    renderApp('/ranking', auth)
    const q = await quick()
    const avatar = await q.findByRole('button', { name: `내 프로필 메뉴 (${DEMO_ACCOUNT_NICKNAME})` })
    expect(within(avatar).getByRole('img', { name: '기본 엠블럼' })).toBeTruthy()
    expect(q.queryByRole('button', { name: '로그아웃' })).toBeNull()
    expect(q.queryByRole('link', { name: '로그인' })).toBeNull()
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

const ranked = valueRanking(today, null)
const teams = teamsOf([...today.hitters, ...today.pitchers])
const enc = encodeURIComponent
const menu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await (await quick()).findByRole('button', { name: /^내 프로필 메뉴/ }))
  return within(await screen.findByRole('dialog', { name: '내 프로필' }))
}
const cards = async () => within(await screen.findByRole('region', { name: '홈 메뉴' }))

async function demoAuth() {
  const auth = createMemoryAuth({ iterations: 1_000 })
  await auth.signInDemo()
  return auth
}

/** 데모 계정의 라인업을 미리 저장해 둔다 (포수·1루수·선발) */
async function saveDemoLineup() {
  const l = emptyLineup()
  const c = today.hitters.find((h) => h.raw.pos === 'C')!
  const b = today.hitters.find((h) => h.raw.pos === '1B')!
  const sp = today.pitchers.find((p) => p.raw.role === 'SP')!
  l.slots.C = c.id; l.slots['1B'] = b.id; l.slots.SP = sp.id; l.order = ['C', '1B']
  const repo = createBrowserLineup({ user: { id: DEMO_ACCOUNT_ID, name: DEMO_ACCOUNT_NICKNAME } })
  await repo.save(l)
  repo.close()
  return [c, b, sp]
}

describe('내 프로필 창 (아이콘 줄 끝의 엠블럼)', () => {
  it('홈에는 로그인 카드·프로필 줄·「내 라인업」 띠가 없다', async () => {
    renderApp('/', await demoAuth())
    await screen.findByRole('region', { name: '홈 메뉴' })
    expect(screen.queryByRole('region', { name: '내 프로필' })).toBeNull()
    expect(screen.queryByRole('region', { name: '내 라인업' })).toBeNull()
    expect(screen.queryByText('로그인해 주세요')).toBeNull()
  })

  it('데모 계정: 닉네임, Lv.3 열성 팬 배지(35점에서 시작), 다음 레벨까지 남은 점수와 점수표', async () => {
    const user = userEvent.setup()
    renderApp('/', await demoAuth())
    const m = await menu(user)
    expect(m.getByText(DEMO_ACCOUNT_NICKNAME, { selector: '.pm-name' })).toBeTruthy()
    expect(m.getByText('열성 팬', { exact: false, selector: '.lv-badge' }).textContent).toBe('Lv.3 열성 팬')
    expect(m.getByText(/Lv\.4 골수 팬까지/).textContent).toBe('35점 · Lv.4 골수 팬까지 25점')
    await user.click(m.getByText('점수표 보기'))
    const rows = m.getAllByRole('row').slice(1).map((r) => [...r.children].map((c) => c.textContent))
    expect(rows).toEqual([
      ['응원하기', '1점', '하루 10번'], ['응원 메시지', '2점', '하루 3번'], ['커뮤니티 글', '3점', '하루 3번'], ['판매글', '3점', '하루 2번'], ['라인업 저장', '5점', '1번'],
    ])
  })

  it('라인업이 없으면 「라인업 만들기」, 저장했으면 총 예상 가치(실제 연봉과 무관합니다.)와 「라인업 편집」. 저장은 5점', async () => {
    const user = userEvent.setup()
    renderApp('/', await demoAuth())
    let lineup = within((await menu(user)).getByRole('region', { name: '내 라인업' }))
    expect(lineup.getByText('아직 저장한 라인업이 없어요.')).toBeTruthy()
    expect(lineup.getByText('실제 연봉과 무관합니다.')).toBeTruthy()
    expect(lineup.getByRole('link', { name: '라인업 만들기' }).getAttribute('href')).toBe('/lineup')
    cleanup()

    const picked = await saveDemoLineup()
    renderApp('/', await demoAuth())
    const value = picked.reduce((s, p) => s + ranked.find((r) => r.player.id === p.id)!.value.total, 0)
    const m = await menu(user)
    lineup = within(m.getByRole('region', { name: '내 라인업' }))
    expect(await lineup.findByText(formatWon(value))).toBeTruthy()
    expect(lineup.getByText(`12자리 중 3자리 · WAR ${picked.reduce((s, p) => s + p.m.WAR, 0).toFixed(2)}`)).toBeTruthy()
    expect(lineup.getByText('실제 연봉과 무관합니다.')).toBeTruthy()
    await waitFor(() => expect(m.getByText(/Lv\.4 골수 팬까지/).textContent).toBe('40점 · Lv.4 골수 팬까지 20점'))
    await user.click(lineup.getByRole('link', { name: '라인업 편집' }))
    expect(await screen.findByRole('heading', { level: 1, name: '나만의 라인업' })).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: '내 프로필' })).toBeNull()
  })

  it('응원 팀이 있으면 그 구단 엠블럼이 동그라미와 창에 보인다', async () => {
    const team = teams[3]
    const auth = createMemoryAuth({ iterations: 1_000 })
    await auth.signUp({ nickname: '반딧불팬', password: 'secret123', team })
    const user = userEvent.setup()
    renderApp('/', auth)
    const avatar = await (await quick()).findByRole('button', { name: '내 프로필 메뉴 (반딧불팬)' })
    expect(await within(avatar).findByRole('img', { name: `${team} 엠블럼` })).toBeTruthy()
    const m = await menu(user)
    expect(m.getByRole('img', { name: `${team} 엠블럼` })).toBeTruthy()
    expect(m.getByText(team)).toBeTruthy()
  })

  it('「프로필 이미지 바꾸기」: 사진을 올리면 동그라미가 사진으로, 「기본 엠블럼으로」로 되돌린다. 사진이 아니면 이유를 알려 준다', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderApp('/', await demoAuth())
    await user.click((await menu(user)).getByRole('button', { name: '프로필 이미지 바꾸기' }))
    expect(screen.queryByRole('dialog', { name: '내 프로필' })).toBeNull()
    const d = within(await screen.findByRole('dialog', { name: '프로필 이미지 바꾸기' }))
    const input = d.getByLabelText('프로필 사진 파일')
    await user.upload(input, new File(['gif'], 'a.gif', { type: 'image/gif' }))
    expect((await d.findByRole('status')).textContent).toContain('PNG, JPG, WEBP 사진만')
    await user.upload(input, new File(['png'], 'me.png', { type: 'image/png' }))
    await waitFor(() => expect(d.getByRole('status').textContent).toBe('프로필 사진을 바꿨어요.'))
    const avatar = within((await quick()).getByRole('button', { name: /^내 프로필 메뉴/ }))
    expect(await avatar.findByRole('img', { name: '내 프로필 사진' })).toBeTruthy()
    await user.click(d.getByRole('button', { name: '기본 엠블럼으로' }))
    await waitFor(() => expect(d.getByRole('status').textContent).toBe('기본 엠블럼으로 되돌렸어요.'))
    expect(avatar.getByRole('img', { name: '기본 엠블럼' })).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '프로필 이미지 바꾸기' })).toBeNull()
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^내 프로필 메뉴/)
  })

  it('「로그아웃」은 창 안에: 누르면 로그아웃되고 그 자리에 「로그인」', async () => {
    const user = userEvent.setup()
    renderApp('/ranking', await demoAuth())
    await user.click((await menu(user)).getByRole('button', { name: '로그아웃' }))
    expect(await (await quick()).findByRole('link', { name: '로그인' })).toBeTruthy()
  })

  it('Esc로 닫으면 동그라미 버튼으로 초점이 돌아간다', async () => {
    const user = userEvent.setup()
    renderApp('/ranking', await demoAuth())
    await menu(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '내 프로필' })).toBeNull()
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^내 프로필 메뉴/)
  })
})

describe('홈: 안내 한 줄 · 검색 · 오늘의 소식', () => {
  const banner = async () => within(await screen.findByRole('region', { name: '오늘의 소식' }))

  it('안내 문구는 한 줄, ⓘ를 누르면 자세한 설명. 선수 검색 칸이 그 바로 아래', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const info = await screen.findByRole('button', { name: '데이터 안내 자세히 보기' })
    expect(info.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByText('가상 데이터로 만든 시연판이에요')).toBeTruthy()
    expect(screen.queryByText(today.meta.notice!)).toBeNull()
    await user.click(info)
    expect(screen.getByText(today.meta.notice!)).toBeTruthy()
    // 화면 순서: 안내 → 검색 칸 → 오늘의 소식 → 카드 메뉴
    const order = [info, await screen.findByRole('combobox', { name: '선수 이름 검색' }), (await screen.findByRole('region', { name: '오늘의 소식' })), screen.getByRole('region', { name: '홈 메뉴' })]
    for (let i = 1; i < order.length; i++) expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('카드 3장: 오늘의 급상승(순위·금액 변화) · 블라인드 퀴즈 · 세이버 픽 챌린지(마감까지), 점 3개', async () => {
    renderApp('/')
    const b = await banner()
    const links = await b.findAllByRole('link')
    expect(links.map((a) => a.querySelector('.today-kind')!.textContent)).toEqual(['오늘의 급상승', '오늘의 블라인드 퀴즈', '세이버 픽 챌린지'])
    const yesterday = buildLeague(await getDataSource('demo').loadDay!(shiftDayKey(dayKeyKST(new Date()), -1)))
    const up = movers(valueRanking(today, yesterday)).up[0]
    await waitFor(() => expect(links[0].textContent).toContain(up.player.name), { timeout: 3000 })
    expect(b.getAllByRole('link')[0].textContent).toContain(`${up.prev!.rank}위 → ${up.rank}위`)
    expect(b.getAllByRole('link')[0].textContent).toContain(valueChangeLabel(up.valueChange))
    expect(b.getAllByRole('link')[0].getAttribute('href')).toBe(`/player/${enc(up.player.id)}?tab=value`)
    expect(links[1].getAttribute('href')).toBe('/games/blind')
    expect(links[1].textContent).toContain('이 지표 카드의 주인공은?')
    expect(links[2].getAttribute('href')).toBe('/games/challenge')
    expect(links[2].textContent).toMatch(/마감까지 .+|제출 마감 · 일요일 경기 뒤 채점/)
    const dots = within(b.getByRole('group', { name: '소식 카드 넘기기' })).getAllByRole('button')
    expect(dots.map((d) => d.getAttribute('aria-label'))).toEqual(['1번째 소식 보기 (3장 중)', '2번째 소식 보기 (3장 중)', '3번째 소식 보기 (3장 중)'])
    expect(dots.map((d) => d.getAttribute('aria-current'))).toEqual(['true', null, null])
  })

  it('점을 누르면 그 카드가 현재 카드가 된다', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const b = await banner()
    const dots = within(b.getByRole('group', { name: '소식 카드 넘기기' })).getAllByRole('button')
    await user.click(dots[2])
    expect(dots.map((d) => d.getAttribute('aria-current'))).toEqual([null, null, 'true'])
  })

  it('블라인드 퀴즈: 누르면 퀴즈로, 오늘 문제를 끝내면 「오늘 퀴즈 완료」', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click((await banner()).getByRole('link', { name: /오늘의 블라인드 퀴즈/ }))
    expect(await screen.findByRole('heading', { level: 1, name: '블라인드 스탯 퀴즈' })).toBeTruthy()
    // 정답이 나올 때까지 보기를 누른다 (틀려도 힌트가 다 열리면 끝난다)
    for (let i = 0; i < 4 && !screen.queryByRole('status'); i++) {
      const opt = screen.getAllByRole('button').find((x) => x.className.includes('opt') && !(x as HTMLButtonElement).disabled)
      if (!opt) break
      await user.click(opt)
    }
    expect(await screen.findByRole('status')).toBeTruthy()
    await user.click(screen.getByRole('link', { name: '홈' }))
    expect((await banner()).getByRole('link', { name: /오늘의 블라인드 퀴즈/ }).textContent).toContain('오늘 퀴즈 완료')
  })

  it('세이버 픽 챌린지: 이번 주 문제를 제출하면 「제출 완료」', async () => {
    const user = userEvent.setup()
    renderApp('/games/challenge')
    await screen.findByRole('button', { name: '제출하기' })
    for (const q of document.querySelectorAll('.q')) await user.click(within(q as HTMLElement).getAllByRole('button')[0])
    await user.click(screen.getByRole('button', { name: '제출하기' }))
    await user.click(screen.getByRole('link', { name: '홈' }))
    const card = (await banner()).getByRole('link', { name: /세이버 픽 챌린지/ })
    expect(card.textContent).toContain('제출 완료')
    expect(card.textContent).not.toMatch(/마감까지/)
  })
})

describe('홈: 카드 메뉴', () => {
  it('넓은 카드 2개(가치 순위·미니게임) + 반쪽 카드 2개(커뮤니티·마켓)와 「선수 비교하기 ›」, 카드마다 SVG 그림', async () => {
    renderApp('/')
    const c = await cards()
    const links = c.getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/ranking', '/games', '/community', '/market', '/compare'])
    expect(links.slice(0, 4).map((a) => a.className)).toEqual(['hub-card wide', 'hub-card wide', 'hub-card half', 'hub-card half'])
    for (const a of links.slice(0, 4)) expect(a.querySelector('svg.card-art')).toBeTruthy()
    expect(links[4].textContent).toContain('선수 비교하기')
    // 가치 순위: 로그아웃이면 전체 1위
    expect(links[0].textContent).toContain('전체 1위')
    expect(links[0].textContent).toContain(ranked[0].player.name)
    // 미니게임: 이번 주 챌린지 마감 (화요일 18:30)
    expect(links[1].textContent).toMatch(/마감까지 .+|제출 마감 · 일요일 경기 뒤 채점/)
  })

  it('커뮤니티·마켓 카드: 최근 24시간 새 글·판매글 수 (가려진 글 제외)', async () => {
    renderApp('/')
    const c = await cards()
    const comm = c.getByRole('link', { name: /커뮤니티/ })
    await waitFor(() => expect(comm.textContent).toMatch(/\d+개/), { timeout: 3000 })
    const market = c.getByRole('link', { name: /마켓/ })
    await waitFor(() => expect(market.textContent).toMatch(/\d+개/), { timeout: 3000 })
    const n = Number(/(\d+)개/.exec(comm.textContent!)![1])
    expect(n).toBeGreaterThan(0)
    expect(Number(/(\d+)개/.exec(market.textContent!)![1])).toBeGreaterThan(0)
    void recentCount
  })

  it('기존 홈의 선수 검색·많이 찾은 선수·WAR 상위 목록은 그대로', async () => {
    renderApp('/')
    expect(await screen.findByRole('combobox', { name: '선수 이름 검색' })).toBeTruthy()
    expect(screen.getByText('오늘 많이 찾은 선수')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'WAR 상위 타자' })).toBeTruthy()
  })
})

describe('아래쪽 탭 바 (휴대폰 폭)', () => {
  const realMatchMedia = window.matchMedia
  const phone = (matches: boolean) => {
    window.matchMedia = ((query: string) => ({ matches, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
  }
  afterEach(() => {
    window.matchMedia = realMatchMedia
  })
  const tabs = async () => within(await screen.findByRole('navigation', { name: '아래 탭' }))
  const tabNames = (t: Awaited<ReturnType<typeof tabs>>) => t.getAllByRole('link').map((a) => a.querySelector('.tab-label')!.textContent)

  it('마켓 · 커뮤니티 · 홈(가운데) · 라인업 · 순위, 지금 화면 표시. 비교·미니게임·선수 카드는 홈 탭', async () => {
    phone(true)
    renderApp('/lineup')
    const t = await tabs()
    expect(tabNames(t)).toEqual(['마켓', '커뮤니티', '홈', '라인업', '순위'])
    expect(t.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/market', '/community', '/', '/lineup', '/ranking'])
    expect(t.getAllByRole('link')[2].className).toContain('tab-home')
    const current = () => t.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.querySelector('.tab-label')!.textContent)
    expect(current()).toEqual(['라인업'])
    const user = userEvent.setup()
    await user.click(t.getByRole('link', { name: /^순위/ }))
    await waitFor(() => expect(current()).toEqual(['순위']))
    cleanup()
    renderApp('/compare')
    expect((await tabs()).getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.textContent)).toEqual(['홈'])
  })

  it('넓은 화면에서는 탭 바 없이 위쪽 메뉴', async () => {
    phone(false)
    renderApp('/')
    expect(await screen.findByRole('navigation', { name: '주요 메뉴' })).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: '아래 탭' })).toBeNull()
  })

  it('커뮤니티 탭: 다른 팬의 새 글이 있으면 점, 커뮤니티를 보고 나면 꺼진다', async () => {
    phone(true)
    const user = userEvent.setup()
    renderApp('/ranking')
    const t = await tabs()
    expect(await t.findByRole('link', { name: /^커뮤니티\s*\(새 글 있음\)$/ }, { timeout: 3000 })).toBeTruthy()
    await user.click(t.getByRole('link', { name: /^커뮤니티/ }))
    await user.click(await t.findByRole('link', { name: /^순위/ }))
    await waitFor(() => expect(t.getByRole('link', { name: /^커뮤니티/ }).textContent).toBe('커뮤니티'))
  })

  it('홈 탭: 로그인했는데 오늘 아직 응원하지 않았으면 점, 응원하면 꺼진다. 로그아웃이면 점 없음', async () => {
    phone(true)
    const user = userEvent.setup()
    renderApp('/ranking')
    const t0 = await tabs()
    await screen.findByRole('link', { name: '로그인' })
    expect(t0.getByRole('link', { name: /^홈/ }).textContent).toBe('홈')
    cleanup()
    renderApp(`/player/${enc(today.hitters[0].id)}/cheer`, await demoAuth())
    const t = await tabs()
    expect(await t.findByRole('link', { name: /^홈\s*\(오늘 아직 응원하지 않았어요\)$/ }, { timeout: 3000 })).toBeTruthy()
    await user.click(await screen.findByRole('button', { name: /응원하기/ }))
    await waitFor(() => expect(t.getByRole('link', { name: /^홈/ }).textContent).toBe('홈'))
  })
})
