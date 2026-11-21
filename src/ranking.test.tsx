// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { openFold } from './testing/folds'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { createMemoryCommunity } from './data/community/memory'
import { createMlbSource } from './data/mlb'
import { SAMPLE_OPTIONS } from './data/mlb/sample'
import { getDataSource } from './data/registry'
import type { LeagueDataSource } from './data/source'
import { dayKeyKST, formatDayKey, shiftDayKey } from './domain/games/calendar'
import { buildLeague } from './domain/league'
import { movers, rankChangeLabel, valueChangeLabel, valueRanking } from './domain/value/ranking'
import { formatWon } from './domain/value/value'
import CommunityProvider from './ui/community/CommunityProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

window.scrollTo = () => {}

const source = getDataSource('demo')
const TODAY = dayKeyKST(new Date())
const today = buildLeague(await source.loadDay!(TODAY))
const yesterday = buildLeague(await source.loadDay!(shiftDayKey(TODAY, -1)))
const rows = valueRanking(today, yesterday)

function renderAt(path: string, src?: LeagueDataSource) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LeagueProvider source={src}>
        <CommunityProvider repository={createMemoryCommunity()}>
          <App />
        </CommunityProvider>
      </LeagueProvider>
    </MemoryRouter>,
  )
}

const table = async () => within(await screen.findByRole('table'))
const bodyRows = async () => (await table()).getAllByRole('row').slice(1)

afterEach(cleanup)

describe('가치 순위표 화면', () => {
  it('상단 메뉴 「가치 순위」로 들어가고, 기준일·갱신 시각·「실제 연봉과 무관합니다.」를 보여 준다', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const nav = await screen.findByRole('navigation', { name: '주요 메뉴' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['홈', '비교', '가치 순위', '라인업', '미니게임', '커뮤니티', '마켓'])
    await user.click(within(nav).getByRole('link', { name: '가치 순위' }))
    expect(await screen.findByRole('heading', { level: 1, name: '선수 가치 순위' })).toBeTruthy()
    expect(screen.getByText(`${formatDayKey(TODAY)} 기준 · 매일 0시(한국 시간) 갱신`)).toBeTruthy()
    expect(screen.getByText('실제 연봉과 무관합니다.')).toBeTruthy()
    expect(within(nav).getByRole('link', { name: '가치 순위' }).getAttribute('aria-current')).toBe('page')
    expect(screen.queryByText(/시연용 날짜예요/)).toBeNull()
  })

  it('표: 순위·변화·선수·팀·포지션·예상 가치·전일 대비가 순위 계산과 같다', async () => {
    renderAt('/ranking')
    const t = await table()
    expect(t.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['순위', '변화', '선수', '팀', '포지션', '예상 가치', '전일 대비'])
    const trs = await bodyRows()
    expect(trs).toHaveLength(rows.length)
    trs.slice(0, 15).forEach((tr, i) => {
      const r = rows[i]
      const cells = within(tr).getAllByRole('cell').map((c) => c.textContent)
      expect(cells[0]).toBe(String(r.rank))
      expect(cells[1]).toBe(rankChangeLabel(r))
      expect(within(tr).getByRole('rowheader').textContent).toContain(r.player.name)
      expect(cells[2]).toBe(r.player.team)
      expect(cells[4]).toBe(formatWon(r.value.total))
      expect(cells[5]).toBe(valueChangeLabel(r.valueChange))
    })
  })

  it('상승은 ▲ 숫자, 하락은 ▼ 숫자로 쓰고 화면 읽기용 문장도 붙인다 (색만으로 구분하지 않음)', async () => {
    renderAt('/ranking')
    await table()
    const up = rows.find((r) => r.rankChange! > 0)!, down = rows.find((r) => r.rankChange! < 0)!
    expect(screen.getAllByLabelText(`${up.rankChange}계단 상승`)[0].textContent).toBe(`▲${up.rankChange}`)
    expect(screen.getAllByLabelText(`${-down.rankChange!}계단 하락`)[0].textContent).toBe(`▼${-down.rankChange!}`)
    expect(screen.getAllByLabelText(`${up.rankChange}계단 상승`)[0].className).toContain('up')
  })

  it('「오늘의 급상승」·「오늘의 급하락」 카드 3명씩', async () => {
    renderAt('/ranking')
    const { up, down } = movers(rows)
    const upSec = within(await screen.findByRole('region', { name: /오늘의 급상승/ }))
    const downSec = within(screen.getByRole('region', { name: /오늘의 급하락/ }))
    expect(upSec.queryAllByRole('listitem').map((li) => within(li).getByRole('link').textContent)).toEqual(up.map((r) => r.player.name))
    expect(downSec.queryAllByRole('listitem').map((li) => within(li).getByRole('link').textContent)).toEqual(down.map((r) => r.player.name))
    expect(up.length).toBeLessThanOrEqual(3)
  })

  it('전체·타자·투수 필터와 팀 필터 (필터 안에서 다시 순위)', async () => {
    const user = userEvent.setup()
    renderAt('/ranking')
    await table()
    await user.click(screen.getByRole('button', { name: '투수' }))
    expect(screen.getByRole('button', { name: '투수' }).getAttribute('aria-pressed')).toBe('true')
    const pitcherRows = await bodyRows()
    expect(pitcherRows).toHaveLength(today.pitchers.length)
    expect(within(pitcherRows[0]).getAllByRole('cell')[0].textContent).toBe('1')
    const team = today.hitters[0].team
    await user.selectOptions(screen.getByLabelText('팀'), team)
    const both = await bodyRows()
    expect(both).toHaveLength(today.pitchers.filter((p) => p.team === team).length)
    await user.click(screen.getByRole('button', { name: '전체' }))
    expect(await bodyRows()).toHaveLength([...today.hitters, ...today.pitchers].filter((p) => p.team === team).length)
  })

  it('선수 이름을 누르면 그 선수 카드의 「선수 가치」 탭이 열리고, 금액이 순위표와 같다', async () => {
    const user = userEvent.setup()
    renderAt('/ranking')
    const r = rows[4]
    await user.click((await table()).getByRole('link', { name: r.player.name }))
    expect(await screen.findByRole('heading', { level: 1, name: r.player.name })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '선수 가치', selected: true })).toBeTruthy()
    const panel = screen.getByRole('tabpanel', { name: '선수 가치' })
    expect(panel.querySelector('.value-amount')!.textContent).toBe(formatWon(r.value.total))
  })

  it('스탯 조절로 바꾼 값은 순위표에 들어가지 않는다', async () => {
    const user = userEvent.setup()
    // 최저 금액에 걸리지 않은 가장 낮은 순위 선수 (최저 금액에 걸려 있으면 스탯을 올려도 금액이 그대로일 수 있다)
    const r = [...rows].reverse().find((x) => !x.value.floorApplied && x.value.total > 30_000_000)!
    renderAt(`/player/${encodeURIComponent(r.player.id)}?tab=value`)
    const panel = await screen.findByRole('tabpanel', { name: '선수 가치' })
    await openFold(user, '스탯 조절', panel)
    const plus = within(panel).getByRole('button', { name: r.player.type === 'H' ? '홈런 늘리기' : '탈삼진 늘리기' })
    for (let i = 0; i < 30; i++) await user.click(plus)
    await user.click(within(panel).getByRole('button', { name: '클러치 점수(승) 늘리기' }))
    expect(panel.querySelector('.value-amount')!.textContent).not.toBe(formatWon(r.value.total))
    await user.click(screen.getByRole('link', { name: '가치 순위' }))
    const tr = (await table()).getByRole('link', { name: r.player.name }).closest('tr')!
    expect(within(tr).getAllByRole('cell')[0].textContent).toBe(String(r.rank))
    expect(within(tr).getAllByRole('cell')[4].textContent).toBe(formatWon(r.value.total))
  })

  it('시연용 날짜 이동: 이전 날·다음 날·오늘로, 실제 날짜와 다르면 기준일 옆과 화면 위에 표시', async () => {
    const user = userEvent.setup()
    renderAt('/ranking')
    await table()
    const demo = within(screen.getByRole('group', { name: '시연용 날짜 이동' }))
    expect((demo.getByRole('button', { name: '오늘로' }) as HTMLButtonElement).disabled).toBe(true)
    await user.click(demo.getByRole('button', { name: '‹ 이전 날' }))
    const prev = shiftDayKey(TODAY, -1)
    expect(await screen.findByText(`${formatDayKey(prev)} 기준 · 매일 0시(한국 시간) 갱신`)).toBeTruthy()
    expect(screen.getByText(`시연용 날짜예요 · 실제 오늘은 ${formatDayKey(TODAY)}`)).toBeTruthy()
    expect(screen.getByText(`시연용 날짜: ${formatDayKey(prev)} 기록을 보고 있어요`)).toBeTruthy()
    // 그날 순위표: 어제 리그와 그 전날 비교
    const prevRows = valueRanking(yesterday, buildLeague(await source.loadDay!(shiftDayKey(TODAY, -2))))
    // 같은 금액의 선수가 여럿일 수 있어(날짜에 따라) 금액이 아니라 1위 줄의 이름이 바뀔 때까지 기다린다
    await waitFor(async () => expect(within((await bodyRows())[0]).getByRole('rowheader').textContent).toContain(prevRows[0].player.name))
    expect(within((await bodyRows())[0]).getByText(formatWon(prevRows[0].value.total))).toBeTruthy()
    await user.click(demo.getByRole('button', { name: '다음 날 ›' }))
    expect(await screen.findByText(`${formatDayKey(TODAY)} 기준 · 매일 0시(한국 시간) 갱신`)).toBeTruthy()
    expect(screen.queryByText(/시연용 날짜예요/)).toBeNull()
    await user.click(demo.getByRole('button', { name: '다음 날 ›' }))
    expect(await screen.findByText(`${formatDayKey(shiftDayKey(TODAY, 1))} 기준 · 매일 0시(한국 시간) 갱신`)).toBeTruthy()
    await user.click(demo.getByRole('button', { name: '오늘로' }))
    expect(await screen.findByText(`${formatDayKey(TODAY)} 기준 · 매일 0시(한국 시간) 갱신`)).toBeTruthy()
  })

  it('날짜별 기록이 없는 출처(MLB)는 전일 비교·날짜 이동 없이 순위만', async () => {
    renderAt('/ranking', createMlbSource(SAMPLE_OPTIONS))
    const t = await table()
    expect(t.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['순위', '선수', '팀', '포지션', '예상 가치'])
    expect(screen.queryByRole('group', { name: '시연용 날짜 이동' })).toBeNull()
    expect(screen.queryByRole('region', { name: /오늘의 급상승/ })).toBeNull()
    expect(screen.getByText('실제 연봉과 무관합니다.')).toBeTruthy()
  })
})
