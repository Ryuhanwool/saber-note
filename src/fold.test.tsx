// @vitest-environment jsdom
// 접었다 펴는 묶음: 수비 탭 4묶음 · 선수 가치 탭의 스탯 조절 · 선수 카드 아래 커뮤니티 이야기·관련 상품
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { getDataSource } from './data/registry'
import { buildLeague } from './domain/league'
import { resetFolds } from './ui/shared/foldState'
import LeagueProvider from './ui/shared/LeagueProvider'

window.scrollTo = () => {}
const league = buildLeague(await getDataSource('demo').load())
const enc = encodeURIComponent
const [ss1, ss2] = league.pool.H.filter((p) => p.raw.pos === 'SS' || p.raw.pos === '2B')
const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><LeagueProvider><App /></LeagueProvider></MemoryRouter>)
const fold = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })

afterEach(() => {
  cleanup()
  resetFolds() // 새로고침한 것처럼
})

describe('접었다 펴는 묶음', () => {
  it('수비 탭: 네 묶음이 처음엔 제목·요약 한 줄만 보이고, 누르면 펼친다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${enc(ss1.id)}`)
    await user.click(await screen.findByRole('tab', { name: '수비' }))
    const panel = screen.getByRole('tabpanel')
    for (const t of ['종합 수비 지표', '세부 구성', '전통 기록', '스카우팅 능력치']) {
      const b = within(panel).getByRole('button', { name: new RegExp(`^${t}`) })
      expect(b.getAttribute('aria-expanded')).toBe('false')
    }
    // 요약에 지표 이름과 값
    expect(fold('종합 수비 지표').textContent).toMatch(/OAA [+−-]?\d/)
    expect(within(panel).queryByRole('button', { name: /^DRS/ })).toBeNull()
    await user.click(fold('종합 수비 지표'))
    expect(fold('종합 수비 지표').getAttribute('aria-expanded')).toBe('true')
    expect(within(panel).getByRole('button', { name: /^DRS/ })).toBeTruthy()
  })

  it('펼친 상태는 다른 선수 카드로 옮겨도 기억하고, 새로고침하면 다시 접힌다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${enc(ss1.id)}`)
    await user.click(await screen.findByRole('tab', { name: '수비' }))
    await user.click(fold('전통 기록'))
    cleanup()
    renderAt(`/player/${enc(ss2.id)}`) // 같은 앱 안에서 다른 선수
    await user.click(await screen.findByRole('tab', { name: '수비' }))
    expect(fold('전통 기록').getAttribute('aria-expanded')).toBe('true')
    expect(fold('세부 구성').getAttribute('aria-expanded')).toBe('false')
    cleanup()
    resetFolds()
    renderAt(`/player/${enc(ss2.id)}`)
    await user.click(await screen.findByRole('tab', { name: '수비' }))
    expect(fold('전통 기록').getAttribute('aria-expanded')).toBe('false')
  })

  it('선수 가치 탭의 스탯 조절: 처음엔 요약 한 줄, 기록을 바꾸면 요약에 바뀐 예상 가치', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${enc(ss1.id)}`)
    await user.click(await screen.findByRole('tab', { name: '선수 가치' }))
    expect(fold('스탯 조절').textContent).toContain('기록을 바꿔 보며')
    expect(screen.queryByRole('button', { name: '홈런 늘리기' })).toBeNull()
    await user.click(fold('스탯 조절'))
    await user.click(screen.getByRole('button', { name: '홈런 늘리기' }))
    expect(fold('스탯 조절').textContent).toMatch(/바꾼 기록이 있어요 · 예상 가치 .+\(원래 .+\)/)
  })

  it('선수 카드 아래 커뮤니티 이야기·관련 상품: 요약 한 줄(글·상품 수)만, 누르면 버튼과 최근 글', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${enc(ss1.id)}`)
    const comm = within(await screen.findByLabelText('커뮤니티 이야기'))
    expect(comm.getByRole('button', { name: /^커뮤니티 이야기/ }).getAttribute('aria-expanded')).toBe('false')
    expect(comm.queryByRole('button', { name: '이 선수 글쓰기' })).toBeNull()
    await user.click(comm.getByRole('button', { name: /^커뮤니티 이야기/ }))
    expect(comm.getByRole('button', { name: '이 선수 글쓰기' })).toBeTruthy()
    const market = within(screen.getByLabelText('이 선수 관련 상품'))
    expect(market.getByRole('button', { name: /^이 선수 관련 상품/ }).getAttribute('aria-expanded')).toBe('false')
  })
})
