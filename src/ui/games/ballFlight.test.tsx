// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import BallFlightView from './BallFlightView'

afterEach(cleanup)
const label = { side: '옆', top: '위' }

describe('타구 애니메이션 그림', () => {
  it('같은 타구 속도·발사각·방향이면, 결과가 안타든 아웃이든 어느 장면이든 그림이 똑같다', () => {
    const base = { ev: 150, la: 24, deg: -12 }
    for (const progress of [0, 0.3, 0.7, 1]) {
      const hit = render(<BallFlightView ball={{ ...base, hit: true, type: '2루타' } as never} fielderPos="LF" progress={progress} label={label} />)
      const a = hit.container.innerHTML
      cleanup()
      const out = render(<BallFlightView ball={{ ...base, hit: false, type: null } as never} fielderPos="LF" progress={progress} label={label} />)
      expect(out.container.innerHTML).toBe(a)
      cleanup()
    }
  })

  it('외부 이미지·라이브러리 없이 SVG, 떨어진 곳 표시는 마지막 장면에만', () => {
    const { container, rerender } = render(<BallFlightView ball={{ ev: 140, la: 20, deg: 5 }} fielderPos="CF" progress={0.5} label={label} />)
    expect(container.querySelectorAll('svg')).toHaveLength(2)
    expect(container.querySelector('image, img, foreignObject')).toBeNull()
    expect(container.querySelector('[data-mark]')).toBeNull()
    rerender(<BallFlightView ball={{ ev: 140, la: 20, deg: 5 }} fielderPos="CF" progress={1} label={label} />)
    expect(container.querySelectorAll('[data-mark]')).toHaveLength(2)
  })
})

describe('마지막 장면의 공 위치', () => {
  const ball = (c: HTMLElement, cls: string) => c.querySelector(`.${cls} .bb-ball`) as SVGCircleElement
  it('담장을 넘는 타구는 마지막 위치가 담장 밖 (옆에서 본 그림의 담장보다 멀리)', () => {
    const { container } = render(<BallFlightView ball={{ ev: 172, la: 28, deg: 8 }} fielderPos="CF" progress={1} label={label} />)
    const side = ball(container, 'bbside')
    const fence = container.querySelector('.bbside rect[fill="var(--ink)"]')!
    expect(Number(side.getAttribute('cx'))).toBeGreaterThan(Number(fence.getAttribute('x')) + 4)
    expect(Number(side.dataset.d)).toBeGreaterThan(Number(/담장 (\d+)m/.exec(container.textContent!)![1]))
  })

  it('땅볼은 땅 위에서 멈춘다 (높이 0)', () => {
    const { container } = render(<BallFlightView ball={{ ev: 130, la: -5, deg: -20 }} fielderPos="SS" progress={1} label={label} />)
    expect(Number(ball(container, 'bbside').dataset.h)).toBe(0)
  })
})
