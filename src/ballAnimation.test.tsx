// @vitest-environment jsdom
// 「이 타구, 안타일까?」 타구 애니메이션: 끝나기 전에는 고를 수 없음, 건너뛰기·다시 보기, 동작 줄이기
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import LeagueProvider from './ui/shared/LeagueProvider'

window.scrollTo = () => {}
const realMatchMedia = window.matchMedia
afterEach(() => {
  cleanup()
  window.matchMedia = realMatchMedia
})

function reducedMotion(on: boolean) {
  window.matchMedia = ((query: string) => ({ matches: on && query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
}

const renderGame = () => render(<MemoryRouter initialEntries={['/games/batted-ball']}><LeagueProvider><App /></LeagueProvider></MemoryRouter>)
const btn = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement
const progress = () => Number(document.querySelector('.bbflight')!.getAttribute('data-progress'))

describe('타구 애니메이션', () => {
  it('애니메이션이 끝나기 전에는 「안타」·「아웃」을 누를 수 없고, 「건너뛰기」를 누르면 바로 누를 수 있다', async () => {
    const user = userEvent.setup()
    renderGame()
    await screen.findByRole('button', { name: '건너뛰기' })
    expect(btn('안타').disabled).toBe(true)
    expect(btn('아웃').disabled).toBe(true)
    expect(screen.getByText('공이 다 날아간 뒤에 고를 수 있어요.')).toBeTruthy()
    await user.click(btn('건너뛰기'))
    expect(btn('안타').disabled).toBe(false)
    expect(btn('아웃').disabled).toBe(false)
    expect(progress()).toBe(1)
    expect(screen.queryByRole('button', { name: '건너뛰기' })).toBeNull()
    // 고르면 지금처럼 정답과 계산 내역표
    await user.click(btn('아웃'))
    expect(screen.getByText('최종 안타 확률')).toBeTruthy()
  })

  it('그대로 두면 1.5~2.5초 안에 공이 멈추고 고를 수 있다. 「다시 보기」는 처음부터 다시', async () => {
    const user = userEvent.setup()
    renderGame()
    await screen.findByRole('button', { name: '건너뛰기' })
    const t0 = performance.now()
    await waitFor(() => expect(btn('안타').disabled).toBe(false), { timeout: 4000, interval: 50 })
    expect(performance.now() - t0).toBeLessThan(3200)
    expect(screen.getByText('공이 멈췄어요.')).toBeTruthy()
    await user.click(btn('다시 보기'))
    expect(btn('안타').disabled).toBe(true)
    expect(progress()).toBeLessThan(1)
    await user.click(btn('건너뛰기'))
    expect(btn('안타').disabled).toBe(false)
  })

  it('다음 타구로 넘어가면 애니메이션이 다시 처음부터', async () => {
    const user = userEvent.setup()
    renderGame()
    await user.click(await screen.findByRole('button', { name: '건너뛰기' }))
    await user.click(btn('안타'))
    await user.click(btn('다음 타구'))
    expect(btn('안타').disabled).toBe(true)
    expect(screen.getByRole('button', { name: '건너뛰기' })).toBeTruthy()
  })

  it('동작 줄이기 설정이면 애니메이션 없이 바로 마지막 장면 (바로 고를 수 있음)', async () => {
    reducedMotion(true)
    renderGame()
    const hit = (await screen.findByRole('button', { name: '안타' })) as HTMLButtonElement
    expect(hit.disabled).toBe(false)
    expect(progress()).toBe(1)
    expect(screen.queryByRole('button', { name: '건너뛰기' })).toBeNull()
    expect(screen.queryByRole('button', { name: '다시 보기' })).toBeNull()
    expect(screen.getByText('동작 줄이기 설정이라 공이 멈춘 장면만 보여 줘요.')).toBeTruthy()
    expect(document.querySelectorAll('[data-mark]')).toHaveLength(2)
  })
})
