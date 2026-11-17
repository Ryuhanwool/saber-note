// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { createMemoryCommunity } from './data/community/memory'
import { createMlbSource } from './data/mlb'
import { SAMPLE_OPTIONS } from './data/mlb/sample'
import { getDataSource } from './data/registry'
import type { LeagueDataSource } from './data/source'
import { formatMetric } from './domain/format'
import { dailyBlind } from './domain/games/blind'
import { dayKeyKST } from './domain/games/calendar'
import { buildLeague } from './domain/league'
import { topByWar } from './domain/search'
import CommunityProvider from './ui/community/CommunityProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

// jsdom은 scrollTo를 구현하지 않아 경고를 남긴다
window.scrollTo = () => {}

const league = buildLeague(await getDataSource('demo').load())
const enc = encodeURIComponent

function renderAt(path: string, source?: LeagueDataSource) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LeagueProvider source={source}>
        <CommunityProvider repository={createMemoryCommunity()}>
          <App />
        </CommunityProvider>
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
    // 데이터 안내는 한 줄로 줄이고, ⓘ를 누르면 자세한 설명이 펼쳐진다
    expect(screen.getByText('가상 데이터로 만든 시연판이에요')).toBeTruthy()
    expect(screen.queryByText(league.meta.notice!)).toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: '데이터 안내 자세히 보기' }))
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

  it('주루 탭으로 바꿀 수 있다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${enc(hitter.id)}`)
    await user.click(await screen.findByRole('tab', { name: '주루' }))
    const panel = within(screen.getByRole('tabpanel'))
    for (const name of [/주루 득점/, /추가 진루율/, /스프린트 스피드/]) expect(panel.getByRole('button', { name })).toBeTruthy()
  })

  it('수비 탭: 종합 지표 4개 · 세부 구성 · 전통 기록 · 능력치를 보여 준다', async () => {
    const user = userEvent.setup()
    const ss = league.pool.H.find((p) => p.raw.pos === 'SS')!
    renderAt(`/player/${enc(ss.id)}`)
    await user.click(await screen.findByRole('tab', { name: '수비' }))
    const panel = within(screen.getByRole('tabpanel'))
    for (const name of ['DRS', 'UZR', 'OAA', 'ZR', '범위 득점', '병살 득점']) expect(panel.getByRole('button', { name: new RegExp(`^${name}`) })).toBeTruthy()
    const trad = panel.getByText('전통 기록').nextElementSibling as HTMLElement
    expect(within(trad).getByText('병살 처리')).toBeTruthy()
    expect(panel.getAllByRole('img', { name: /점, / })).toHaveLength(ss.raw.fielding.ratings!.length)
    expect(panel.getByText(/데이터 출처: 가상 데이터/)).toBeTruthy()
  })

  it('지명타자는 수비 탭에서 수비 지표가 없다고 알려 준다', async () => {
    const user = userEvent.setup()
    const dh = league.pool.H.find((p) => p.raw.pos === 'DH')!
    renderAt(`/player/${enc(dh.id)}`)
    await user.click(await screen.findByRole('tab', { name: '수비' }))
    expect(screen.getByText(/지명타자는 수비에 나서지 않아/)).toBeTruthy()
  })

  it('트래킹 탭: 타구 지표와 타구 40개 분포 그래프', async () => {
    const user = userEvent.setup()
    const { container } = renderAt(`/player/${enc(hitter.id)}`)
    await user.click(await screen.findByRole('tab', { name: '트래킹' }))
    const panel = within(screen.getByRole('tabpanel'))
    expect(panel.getByRole('button', { name: /평균 타구 속도/ })).toBeTruthy()
    expect(await panel.findByRole('img', { name: /타구 속도와 발사각 분포 \(타구 40개\)/ })).toBeTruthy()
    expect(container.querySelectorAll('circle[data-hit]')).toHaveLength(40)
  })

  it('투수 트래킹 탭: 구속·회전수·헛스윙과 구종 비율', async () => {
    const user = userEvent.setup()
    const pitcher = league.pitchers[0]
    renderAt(`/player/${enc(pitcher.id)}`)
    await user.click(await screen.findByRole('tab', { name: '트래킹' }))
    expect(screen.getByRole('button', { name: /평균 직구 구속/ })).toBeTruthy()
    expect(screen.getByText('구종 비율')).toBeTruthy()
    expect(screen.getByText(pitcher.raw.tracking.mix![0].pitch)).toBeTruthy()
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
    expect(screen.getAllByRole('row')).toHaveLength(1 + 8 + 1) // 머리줄 + 지표 8 + 예상 가치
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
  it('선수 카드를 보는 동안에는 「홈」 메뉴만 현재 위치로 표시한다 (선수 검색이 홈에 있다)', async () => {
    renderAt(`/player/${enc(league.hitters[0].id)}`)
    await screen.findByRole('heading', { level: 1 })
    const current = screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')
    expect(current.map((a) => a.textContent)).toEqual(['홈'])
  })
})

describe('MLB 출처: 없는 지표 줄은 숨긴다', () => {
  const mlbSource = createMlbSource(SAMPLE_OPTIONS)
  const id = (n: number) => enc(`mlb:${n}`)

  it('수비 탭에는 OAA만 있고 DRS·UZR·ZR·세부 구성·전통 기록·능력치는 없다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${id(9001)}`, mlbSource)
    await user.click(await screen.findByRole('tab', { name: '수비' }))
    const panel = within(screen.getByRole('tabpanel'))
    expect(panel.getByRole('button', { name: /^OAA/ })).toBeTruthy()
    for (const name of ['DRS', 'UZR', 'ZR', '범위 득점']) expect(panel.queryByRole('button', { name: new RegExp(`^${name}`) }), name).toBeNull()
    expect(panel.queryByText('전통 기록')).toBeNull()
    expect(panel.queryByText(/스카우팅 능력치/)).toBeNull()
    expect(panel.getByText(/데이터 출처: Baseball Savant · 2026.10.01 반영/)).toBeTruthy()
  })

  it('OAA가 없는 포수는 수비 기록이 없다고 알려 준다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${id(9002)}`, mlbSource)
    await user.click(await screen.findByRole('tab', { name: '수비' }))
    expect(screen.getByText('이 선수는 제공되는 수비 기록이 없어요.')).toBeTruthy()
  })

  it('주루 탭에서 추가 진루율 줄은 숨기고, 스프린트 스피드는 m/s로 보여 준다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${id(9001)}`, mlbSource)
    await user.click(await screen.findByRole('tab', { name: '주루' }))
    const panel = within(screen.getByRole('tabpanel'))
    expect(panel.queryByRole('button', { name: /추가 진루율/ })).toBeNull()
    expect(panel.getByText(`${(29.5 * 0.3048).toFixed(2)} m/s`)).toBeTruthy()
  })

  it('트래킹 탭의 타구 속도는 km/h로 보여 준다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${id(9001)}`, mlbSource)
    await user.click(await screen.findByRole('tab', { name: '트래킹' }))
    expect(screen.getByText(`${(100 * 1.609344).toFixed(1)} km/h`)).toBeTruthy()
  })

  it('비교 화면에 DRS 줄이 없다', async () => {
    renderAt(`/compare?a=${id(9001)}&b=${id(9004)}`, mlbSource)
    expect(await screen.findByRole('table')).toBeTruthy()
    expect(screen.getAllByRole('row')).toHaveLength(1 + 7 + 1) // 머리줄 + 지표 7 + 예상 가치
    expect(screen.queryByRole('rowheader', { name: 'DRS' })).toBeNull()
  })
})

describe('화면 6. 미니게임', () => {
  it('게임 카드 4장과 이번 주 챌린지 배너', async () => {
    renderAt('/games')
    for (const name of ['지표 업다운', '블라인드 스탯 퀴즈', '세이버 픽 챌린지', '이 타구, 안타일까?']) {
      expect(await screen.findByRole('button', { name: new RegExp(name) })).toBeTruthy()
    }
    expect(screen.getByText('이번 주 세이버 픽 챌린지')).toBeTruthy()
  })

  it('지표 업다운: 고르면 오른쪽 값과 결과가 나오고 다음 버튼이 생긴다', async () => {
    const user = userEvent.setup()
    renderAt('/games/updown')
    await user.click(await screen.findByRole('button', { name: '더 높다' }))
    const status = screen.getByRole('status')
    expect(status.textContent).toMatch(/정답!|아쉬워요\./)
    expect(screen.getByRole('button', { name: /다음 선수|다시 시작/ })).toBeTruthy()
  })

  it('블라인드 퀴즈: 오늘의 문제 정답을 고르면 이긴다', async () => {
    const user = userEvent.setup()
    const q = dailyBlind(league.pool.H, dayKeyKST(new Date()))!
    renderAt('/games/blind')
    await user.click(await screen.findByRole('button', { name: q.target.name }))
    expect(screen.getByRole('status').textContent).toMatch(/정답! 힌트 없이 맞혔어요/)
  })

  it('블라인드 퀴즈: 3번 틀리면 정답을 알려 주고 힌트가 모두 열린다', async () => {
    const user = userEvent.setup()
    const q = dailyBlind(league.pool.H, dayKeyKST(new Date()))!
    renderAt('/games/blind')
    for (const p of q.options.filter((x) => x !== q.target)) await user.click(await screen.findByRole('button', { name: p.name }))
    expect(screen.getByRole('status').textContent).toContain(`정답은 ${q.target.name}이었어요`)
    expect(screen.getByText(`나이: ${q.target.raw.age}세`)).toBeTruthy()
  })

  it('세이버 픽 챌린지: 5문제를 고르고 제출 → 일주일 진행 → 점수와 근거', async () => {
    const user = userEvent.setup()
    renderAt('/games/challenge')
    const submit = await screen.findByRole('button', { name: '제출하기' })
    expect((submit as HTMLButtonElement).disabled).toBe(true)
    const picks = screen.getAllByRole('button', { pressed: false })
    for (let i = 0; i < picks.length; i += 2) await user.click(picks[i])
    await user.click(submit)
    await user.click(screen.getByRole('button', { name: /일주일 경기 진행하기/ }))
    // 점수: 배너 1개 + 순위표 8명 (가상 참가자 7명 + 나)
    expect(await screen.findAllByText(/^\d+점$/)).toHaveLength(1 + 8)
    expect(screen.getAllByText(/^근거:/)).toHaveLength(5)
    expect(screen.getByText(/가상 참가자, 데모/)).toBeTruthy()
  })

  it('이 타구, 안타일까?: 10구를 풀면 결과를 보여 준다', async () => {
    const user = userEvent.setup()
    renderAt('/games/batted-ball')
    for (let i = 0; i < 10; i++) {
      // 타구 애니메이션이 끝나야 고를 수 있다 — 건너뛰기
      await user.click(await screen.findByRole('button', { name: '건너뛰기' }))
      await user.click(await screen.findByRole('button', { name: '안타' }))
      expect(screen.getByText('최종 안타 확률')).toBeTruthy()
      await user.click(screen.getByRole('button', { name: i === 9 ? '결과 보기' : '다음 타구' }))
    }
    expect(screen.getByRole('status').textContent).toMatch(/10구 중 \d+개를 맞혔어요/)
  })

  it('MLB 출처에서는 주간 기록이 없어 챌린지 카드가 닫힌다', async () => {
    renderAt('/games', createMlbSource(SAMPLE_OPTIONS))
    const card = await screen.findByRole('button', { name: /세이버 픽 챌린지/ })
    expect((card as HTMLButtonElement).disabled).toBe(true)
    expect(card.textContent).toContain('주간 기록을 제공하지 않는 데이터 출처예요.')
    expect(screen.queryByText('이번 주 세이버 픽 챌린지')).toBeNull()
  })
})
