// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { getDataSource } from './data/registry'
import { formatMetric } from './domain/format'
import { buildLeague } from './domain/league'
import { topByWar } from './domain/search'
import LeagueProvider from './ui/shared/LeagueProvider'

// jsdom은 scrollTo를 구현하지 않아 경고를 남긴다
window.scrollTo = () => {}

const league = buildLeague(await getDataSource('demo').load())
const enc = encodeURIComponent

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LeagueProvider>
        <App />
      </LeagueProvider>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('화면 1. 검색 홈', () => {
  it('이름을 입력하면 자동완성(이름 · 팀 · 포지션)이 뜨고, 누르면 선수 카드로 간다', async () => {
    const user = userEvent.setup()
    const target = league.hitters[7]
    renderAt('/')
    await user.type(await screen.findByRole('combobox', { name: '선수 이름 검색' }), target.name)
    const option = await screen.findByRole('option', { name: new RegExp(target.name) })
    expect(option.textContent).toContain(target.team)
    await user.click(option)
    expect(await screen.findByRole('heading', { level: 1, name: target.name })).toBeTruthy()
  })

  it('키보드로 고르고 Enter로 연다', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const box = await screen.findByRole('combobox')
    await user.type(box, '수달스')
    const options = screen.getAllByRole('option')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(await screen.findByRole('heading', { level: 1, name: options[1].querySelector('span')!.textContent! })).toBeTruthy()
  })

  it('맞는 선수가 없으면 안내 문구를 보여 준다', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.type(await screen.findByRole('combobox'), '없는선수')
    expect(screen.getByText(/“없는선수”와 맞는 선수가 없어요/)).toBeTruthy()
  })

  it('WAR 상위 타자·투수 5명과 데이터 안내 문구를 보여 준다', async () => {
    renderAt('/')
    const topH = topByWar(league.hitters, 5)
    const panel = (await screen.findByRole('heading', { name: 'WAR 상위 타자' })).parentElement!
    expect(within(panel).getAllByRole('listitem')).toHaveLength(5)
    expect(within(panel).getAllByRole('listitem')[0].textContent).toContain(formatMetric('WAR', topH[0].m.WAR))
    expect(screen.getByText(league.meta.notice!)).toBeTruthy()
  })
})

describe('화면 2. 선수 지표 카드', () => {
  const hitter = league.pool.H[0]

  it('이름·팀·시즌과 계산 기준을 표시하고, 지표마다 값과 상위 %를 보여 준다', async () => {
    renderAt(`/player/${enc(hitter.id)}`)
    expect(await screen.findByRole('heading', { level: 1, name: hitter.name })).toBeTruthy()
    expect(screen.getByText(league.meta.seasonLabel)).toBeTruthy()
    expect(screen.getByText(/계산 기준: 데모 간이 공식/)).toBeTruthy()
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByRole('button', { name: /wRC\+/ })).toBeTruthy()
    expect(within(panel).getByText(formatMetric('wrcp', hitter.m.wrcp))).toBeTruthy()
    expect(within(panel).getAllByRole('img', { name: /리그 상위 \d+%/ }).length).toBeGreaterThan(0)
  })

  it('ⓘ를 누르면 쉬운 설명과 기준·리그 평균이 열리고, 다시 누르면 닫힌다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${enc(hitter.id)}`)
    const btn = await screen.findByRole('button', { name: /wRC\+/ })
    await user.click(btn)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(/리그 평균 100에 맞춘 값/)).toBeTruthy()
    expect(screen.getByText(/기준: 120 이상 좋음/)).toBeTruthy()
    await user.click(btn)
    expect(screen.queryByText(/리그 평균 100에 맞춘 값/)).toBeNull()
  })

  it('주루 탭으로 바꿀 수 있고, 수비·트래킹 탭은 아직 열리지 않는다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${enc(hitter.id)}`)
    await user.click(await screen.findByRole('tab', { name: '주루' }))
    expect(within(screen.getByRole('tabpanel')).getByRole('button', { name: /주루 득점/ })).toBeTruthy()
    expect((screen.getByRole('tab', { name: '수비' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('tab', { name: '트래킹' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('300타석 미만 타자에게는 백분위가 참고용이라고 알려 준다', async () => {
    const bench = league.hitters.find((p) => !p.qualified)!
    renderAt(`/player/${enc(bench.id)}`)
    expect(await screen.findByText(/300타석 미만이라 백분위는 참고용/)).toBeTruthy()
  })

  it('투수는 투구 탭으로 시작하고 이닝을 표시한다', async () => {
    const pitcher = league.pitchers[0]
    renderAt(`/player/${enc(pitcher.id)}`)
    expect(await screen.findByRole('tab', { name: '투구', selected: true })).toBeTruthy()
    expect(screen.getByText(/이닝$/)).toBeTruthy()
  })

  it('비교하기를 누르면 이 선수가 왼쪽에 놓인 비교 화면으로 간다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${enc(hitter.id)}`)
    await user.click(await screen.findByRole('button', { name: '비교하기' }))
    expect((screen.getByLabelText('왼쪽 선수') as HTMLSelectElement).value).toBe(hitter.id)
  })

  it('없는 선수 주소면 안내를 보여 준다', async () => {
    renderAt('/player/demo%3A9999')
    expect(await screen.findByText('선수를 찾을 수 없어요.')).toBeTruthy()
  })
})

describe('화면 3. 선수 2명 비교', () => {
  it('같은 지표를 나란히 놓고 우세 요약과 근거를 보여 준다', async () => {
    const [a, b] = league.pool.H
    renderAt(`/compare?a=${enc(a.id)}&b=${enc(b.id)}`)
    expect(await screen.findByRole('table')).toBeTruthy()
    expect(screen.getAllByRole('row')).toHaveLength(1 + 8)
    expect(screen.getByText(/지표 8개 중 .*(우세해요|앞서요)/)).toBeTruthy()
    expect(screen.getByText(/^근거:/)).toBeTruthy()
  })

  it('선수를 고르면 비교가 나타나고, 타자와 투수는 비교하지 않는다', async () => {
    const user = userEvent.setup()
    renderAt('/compare')
    expect(await screen.findByText('두 선수를 고르면 같은 지표를 나란히 비교해 드려요.')).toBeTruthy()
    await user.selectOptions(screen.getByLabelText('왼쪽 선수'), league.hitters[0].id)
    await user.selectOptions(screen.getByLabelText('오른쪽 선수'), league.pitchers[0].id)
    expect(screen.getByText(/타자는 타자끼리, 투수는 투수끼리/)).toBeTruthy()
    await user.selectOptions(screen.getByLabelText('오른쪽 선수'), league.hitters[1].id)
    expect(screen.getByRole('table')).toBeTruthy()
  })
})

describe('상단 메뉴', () => {
  it('선수 카드를 보는 동안에는 "선수" 메뉴만 현재 위치로 표시한다', async () => {
    renderAt(`/player/${enc(league.hitters[0].id)}`)
    await screen.findByRole('heading', { level: 1 })
    const current = screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')
    expect(current.map((a) => a.textContent)).toEqual(['선수'])
  })
})
