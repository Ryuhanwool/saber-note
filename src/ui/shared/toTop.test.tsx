// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ToTop from './ToTop'

const page = (height: number, scrollY: number) => {
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, get: () => height })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}
afterEach(cleanup)

describe('「맨 위로」', () => {
  it('화면 2개보다 긴 화면에서 한 화면 넘게 내려오면 보이고, 누르면 맨 위로 간다', () => {
    const scrollTo = vi.fn()
    window.scrollTo = scrollTo as never
    render(<ToTop />)
    page(3000, 0)
    expect(screen.queryByRole('button', { name: '맨 위로' })).toBeNull()
    page(3000, 600) // 맨 위 근처(한 화면 안)에서는 숨김
    expect(screen.queryByRole('button', { name: '맨 위로' })).toBeNull()
    page(3000, 900)
    fireEvent.click(screen.getByRole('button', { name: '맨 위로' }))
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
  })

  it('화면 2개 이하로 짧은 화면에는 없다', () => {
    render(<ToTop />)
    page(1600, 700)
    expect(screen.queryByRole('button', { name: '맨 위로' })).toBeNull()
  })
})
