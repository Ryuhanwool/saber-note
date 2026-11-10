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
import { dayKeyKST } from './domain/games/calendar'
import { buildLeague } from './domain/league'
import { recentCount } from './domain/hub/news'
import { emptyLineup } from './domain/lineup/lineup'
import { teamsOf } from './domain/market/catalog'
import { valueRanking } from './domain/value/ranking'
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

const ranked = valueRanking(today, null)
const teams = teamsOf([...today.hitters, ...today.pitchers])
const enc = encodeURIComponent
const profile = async () => within(await screen.findByRole('region', { name: '내 프로필' }))
const band = async () => within(await screen.findByRole('region', { name: '내 라인업' }))
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

describe('홈: 프로필 줄', () => {
  it('로그아웃 상태: 기본 엠블럼과 「로그인」 버튼, 라인업 띠는 「라인업 만들기」', async () => {
    renderApp('/')
    const p = await profile()
    expect(p.getByRole('img', { name: '기본 엠블럼' })).toBeTruthy()
    expect(p.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe('/login?next=%2F')
    expect(p.queryByRole('button', { name: '프로필 이미지 바꾸기' })).toBeNull()
    const b = await band()
    expect(await b.findByText('로그인하면 나만의 라인업을 저장할 수 있어요.')).toBeTruthy()
    expect(b.getByText('실제 연봉과 무관합니다.')).toBeTruthy()
    expect(b.getByRole('link', { name: '라인업 만들기' }).getAttribute('href')).toBe('/lineup')
  })

  it('데모 계정: 닉네임과 Lv.3 열성 팬 배지(35점에서 시작), 누르면 다음 레벨까지 남은 점수와 점수표', async () => {
    const user = userEvent.setup()
    renderApp('/', await demoAuth())
    const p = await profile()
    expect(await p.findByText(DEMO_ACCOUNT_NICKNAME)).toBeTruthy()
    const badge = await p.findByRole('button', { name: 'Lv.3 열성 팬' })
    await user.click(badge)
    const pop = within(await screen.findByRole('dialog', { name: '팬 레벨' }))
    expect(pop.getByRole('heading').textContent).toBe('팬 레벨 · 35점')
    expect(pop.getByText(/다음 레벨/).textContent).toBe('다음 레벨 Lv.4 골수 팬까지 25점')
    const rows = pop.getAllByRole('row').slice(1).map((r) => [...r.children].map((c) => c.textContent))
    expect(rows).toEqual([
      ['응원하기', '1점', '하루 10번'], ['응원 메시지', '2점', '하루 3번'], ['커뮤니티 글', '3점', '하루 3번'], ['판매글', '3점', '하루 2번'], ['라인업 저장', '5점', '1번'],
    ])
  })

  it('라인업을 저장했으면: 라인업 총 가치·이번 주 응원 숫자, 띠에 총 가치·총 WAR·채운 자리, 「라인업 편집」. 저장은 5점', async () => {
    const user = userEvent.setup()
    const picked = await saveDemoLineup()
    renderApp('/', await demoAuth())
    const value = picked.reduce((s, p) => s + ranked.find((r) => r.player.id === p.id)!.value.total, 0)
    const b = await band()
    expect(await b.findByText('12자리 중 3자리')).toBeTruthy()
    expect(b.getByText(formatWon(value))).toBeTruthy()
    expect(b.getByText(picked.reduce((s, p) => s + p.m.WAR, 0).toFixed(2))).toBeTruthy()
    expect(b.getByRole('link', { name: '라인업 편집' }).getAttribute('href')).toBe('/lineup')
    const p = await profile()
    const chip = p.getByRole('link', { name: /라인업 총 가치/ })
    expect(chip.textContent).toContain(formatWon(value))
    expect(p.getByRole('link', { name: /이번 주 응원 0번/ })).toBeTruthy()
    await user.click(await p.findByRole('button', { name: /Lv\.3/ }))
    expect((await screen.findByRole('dialog', { name: '팬 레벨' })).querySelector('h2')!.textContent).toBe('팬 레벨 · 40점')
  })

  it('「이번 주 응원」: 응원 팀이 없으면 전체 가치 1위 선수의 응원방으로', async () => {
    const user = userEvent.setup()
    renderApp('/', await demoAuth())
    await user.click(await (await profile()).findByRole('link', { name: new RegExp(`이번 주 응원 0번 — ${ranked[0].player.name} 응원방으로`) }))
    expect(await screen.findByRole('heading', { level: 1, name: new RegExp(ranked[0].player.name) })).toBeTruthy()
  })

  it('응원 팀이 있으면: 그 구단 엠블럼, 「이번 주 응원」과 가치 순위 카드는 응원 팀 가치 1위 선수', async () => {
    const team = teams[3]
    const auth = createMemoryAuth({ iterations: 1_000 })
    await auth.signUp({ nickname: '반딧불팬', password: 'secret123', team })
    renderApp('/', auth)
    const p = await profile()
    expect(await p.findByRole('img', { name: `${team} 엠블럼` })).toBeTruthy()
    const top = ranked.find((r) => r.player.team === team)!
    expect(p.getByRole('link', { name: new RegExp(`${top.player.name} 응원방으로`) }).getAttribute('href')).toBe(`/player/${enc(top.player.id)}/cheer`)
    const card = (await cards()).getByRole('link', { name: /선수 가치 순위/ })
    expect(card.textContent).toContain(`${team} 1위 · 전체 ${top.rank}위`)
    expect(card.textContent).toContain(top.player.name)
  })

  it('엠블럼을 누르면 「프로필 이미지 바꾸기」: 사진을 올리면 사진으로, 「기본 엠블럼으로」로 되돌린다. 사진이 아니면 이유를 알려 준다', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderApp('/', await demoAuth())
    const p = await profile()
    await user.click(await p.findByRole('button', { name: '프로필 이미지 바꾸기' }))
    const d = within(await screen.findByRole('dialog', { name: '프로필 이미지 바꾸기' }))
    const input = d.getByLabelText('프로필 사진 파일')
    await user.upload(input, new File(['gif'], 'a.gif', { type: 'image/gif' }))
    expect((await d.findByRole('status')).textContent).toContain('PNG, JPG, WEBP 사진만')
    await user.upload(input, new File(['png'], 'me.png', { type: 'image/png' }))
    await waitFor(() => expect(d.getByRole('status').textContent).toBe('프로필 사진을 바꿨어요.'))
    const emblemBtn = within(p.getByRole('button', { name: '프로필 이미지 바꾸기' }))
    expect(await emblemBtn.findByRole('img', { name: '내 프로필 사진' })).toBeTruthy()
    await user.click(d.getByRole('button', { name: '기본 엠블럼으로' }))
    await waitFor(() => expect(d.getByRole('status').textContent).toBe('기본 엠블럼으로 되돌렸어요.'))
    expect(emblemBtn.getByRole('img', { name: '기본 엠블럼' })).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '프로필 이미지 바꾸기' })).toBeNull()
    expect(document.activeElement).toBe(p.getByRole('button', { name: '프로필 이미지 바꾸기' }))
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
