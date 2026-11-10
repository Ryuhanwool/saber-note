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
import { buildLeague } from './domain/league'
import { clutchScore, evidenceSummary } from './domain/value/clutch'
import { formatWon, playerValue, valueFormula } from './domain/value/value'
import CommunityProvider from './ui/community/CommunityProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

window.scrollTo = () => {}

const league = buildLeague(await getDataSource('demo').load())

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

async function openValueTab(path: string, source?: LeagueDataSource) {
  const user = userEvent.setup()
  renderAt(path, source)
  await user.click(await screen.findByRole('tab', { name: '선수 가치' }))
  return { user, panel: await screen.findByRole('tabpanel', { name: '선수 가치' }) }
}

afterEach(cleanup)

describe('선수 카드 「선수 가치」 탭', () => {
  const hitter = league.hitters.reduce((a, b) => (b.m.WAR > a.m.WAR ? b : a))

  it('예상 가치를 크게, 바로 아래 「실제 연봉과 무관합니다.」, 계산 과정과 클러치 근거를 보여 준다', async () => {
    const { panel } = await openValueTab(`/player/${hitter.id}`)
    const v = playerValue(league, hitter)
    const amount = panel.querySelector('.value-amount')!
    expect(amount.textContent).toBe(formatWon(v.total))
    expect(amount.nextElementSibling!.textContent).toBe('실제 연봉과 무관합니다.')
    expect(within(panel).getByText(valueFormula(v))).toBeTruthy()
    expect(within(panel).getByRole('heading', { name: '클러치 근거' })).toBeTruthy()
    expect(within(panel).getByText(evidenceSummary(clutchScore(league, hitter)!))).toBeTruthy()
    expect(within(panel).getByText(/경기당 클러치/)).toBeTruthy()
  })

  it('홈런을 늘리면 바뀐 값과 원래 값을 나란히 보여 주고, 「원래 기록으로」로 되돌린다', async () => {
    const { user, panel } = await openValueTab(`/player/${hitter.id}`)
    const reset = within(panel).getByRole('button', { name: '원래 기록으로' }) as HTMLButtonElement
    expect(reset.disabled).toBe(true)
    for (let i = 0; i < 10; i++) await user.click(within(panel).getByRole('button', { name: '홈런 늘리기' }))
    expect(within(panel).getByText(`${hitter.raw.HR + 10}개`)).toBeTruthy()
    expect(within(panel).getAllByText(`원래 ${hitter.raw.HR}개`).length).toBeGreaterThan(0)
    expect(within(panel).getByText(/원래 .* → 바꾼 기록 .*/)).toBeTruthy()
    expect(within(panel).getByText('바뀜')).toBeTruthy()
    expect(panel.querySelector('.value-amount')!.textContent).not.toBe(formatWon(playerValue(league, hitter).total))
    expect(reset.disabled).toBe(false)
    await user.click(reset)
    expect(panel.querySelector('.value-amount')!.textContent).toBe(formatWon(playerValue(league, hitter).total))
    expect(within(panel).queryByText('바뀜')).toBeNull()
  })

  it('클러치 점수를 0.1 올리면 1,000만 원이 늘어난다 (클러치가 0보다 클 때)', async () => {
    const p = [...league.hitters, ...league.pitchers].find((x) => playerValue(league, x).clutch! > 0.2 && !playerValue(league, x).floorApplied)!
    const { user, panel } = await openValueTab(`/player/${p.id}`)
    await user.click(within(panel).getByRole('button', { name: '클러치 점수(승) 늘리기' }))
    expect(panel.querySelector('.value-amount')!.textContent).toBe(formatWon(playerValue(league, p).total + 10_000_000))
  })

  it('홈런은 안타보다 많아질 수 없다 (안타를 홈런 아래로 못 내림)', async () => {
    const small = league.hitters.reduce((a, b) => (b.raw.PA < a.raw.PA ? b : a))
    const { panel } = await openValueTab(`/player/${small.id}`)
    const range = within(panel).getByRole('slider', { name: '안타' }) as HTMLInputElement
    expect(Number(range.min)).toBe(small.raw.HR)
    const hr = within(panel).getByRole('slider', { name: '홈런' }) as HTMLInputElement
    expect(Number(hr.max)).toBe(small.raw.S1 + small.raw.D2 + small.raw.D3 + small.raw.HR)
  })

  it('투수: 이닝·탈삼진·볼넷·피홈런·자책점, 자책점은 가치에 영향이 없다는 안내, 이닝은 0이 될 수 없다', async () => {
    const p = league.pitchers[0]
    const { panel } = await openValueTab(`/player/${p.id}`)
    for (const n of ['이닝', '탈삼진', '볼넷', '피홈런', '자책점']) expect(within(panel).getByRole('slider', { name: n })).toBeTruthy()
    expect(within(panel).getByText(/자책점을 바꾸면 ERA만 바뀌고/)).toBeTruthy()
    expect(Number((within(panel).getByRole('slider', { name: '이닝' }) as HTMLInputElement).min)).toBe(1)
  })

  it('클러치 기록이 없는 출처(MLB)에서는 클러치 부분을 숨긴다', async () => {
    const mlb = createMlbSource(SAMPLE_OPTIONS)
    const ds = await mlb.load()
    const { panel } = await openValueTab(`/player/${ds.hitters[0].id}`, mlb)
    expect(within(panel).queryByRole('heading', { name: '클러치 근거' })).toBeNull()
    expect(within(panel).queryByRole('button', { name: '클러치 점수(승) 늘리기' })).toBeNull()
    expect(within(panel).queryByText(/클러치 [−\d]/)).toBeNull()
    expect(within(panel).getByText('실제 연봉과 무관합니다.')).toBeTruthy()
  })
})
