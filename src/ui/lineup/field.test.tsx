// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { LINEUP_SLOTS, SLOT_LABEL } from '../../domain/lineup/slots'
import Field from './Field'
import { SLOT_POS } from './fieldLayout'

afterEach(cleanup)

describe('야구장 그림과 자리 버튼', () => {
  it('자리 12개: 비어 있으면 포지션 이름, 채우면 선수 이름과 타순', async () => {
    const picked: string[] = []
    const user = userEvent.setup()
    render(<Field slots={[{ slot: '2B', name: '김도윤', order: 3 }, { slot: 'CL', name: '박하준', order: null }]} onSelect={(s) => picked.push(s)} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(12)
    expect(screen.getByRole('button', { name: '포수 — 비어 있음, 선수 고르기' }).textContent).toBe('포수')
    const second = screen.getByRole('button', { name: '2루수: 김도윤, 3번 타자 — 바꾸기' })
    expect(second.textContent).toBe('김도윤3')
    expect(screen.getByRole('button', { name: '마무리 투수: 박하준 — 바꾸기' }).textContent).toBe('박하준')
    await user.click(second)
    expect(picked).toEqual(['2B'])
    for (const slot of LINEUP_SLOTS) expect(screen.getByRole('button', { name: new RegExp(`^${SLOT_LABEL[slot]}`) })).toBeTruthy()
  })

  it('외부 이미지 없이 SVG로 그린다 (잔디·줄무늬·흙·파울 라인·베이스·마운드·홈·불펜)', () => {
    const { container } = render(<Field slots={[]} onSelect={() => {}} />)
    const svg = container.querySelector('svg')!
    expect(container.querySelector('img')).toBeNull()
    for (const cls of ['f-foul', 'f-grass', 'f-stripe', 'f-dirt', 'f-line', 'f-base', 'f-pen']) expect(svg.querySelector(`.${cls}`), cls).not.toBeNull()
    expect(svg.textContent).toContain('불펜')
  })

  it('휴대폰 폭(야구장 320px)에서 56px 버튼끼리 겹치지 않고, 모두 야구장 안에 있다', () => {
    const unitsPerPx = 1000 / 320
    const minGap = 56 * unitsPerPx
    const pts = LINEUP_SLOTS.map((s) => [s, SLOT_POS[s]] as const)
    for (let i = 0; i < pts.length; i++) {
      const [a, p] = pts[i]
      expect(p.x - minGap / 2, a).toBeGreaterThanOrEqual(0)
      expect(p.x + minGap / 2, a).toBeLessThanOrEqual(1000)
      expect(p.y + minGap / 2, a).toBeLessThanOrEqual(1000)
      for (let j = i + 1; j < pts.length; j++) {
        const [bName, q] = pts[j]
        expect(Math.hypot(p.x - q.x, p.y - q.y), `${a}–${bName}`).toBeGreaterThanOrEqual(minGap)
      }
    }
    // 지명타자는 1루 쪽 오른편, 불펜(중간·마무리)은 3루 쪽 왼편 여백
    expect(SLOT_POS.DH.x).toBeGreaterThan(SLOT_POS['1B'].x)
    expect(SLOT_POS.MR.x).toBeLessThan(SLOT_POS['3B'].x)
    expect(SLOT_POS.MR.y).toBeLessThan(SLOT_POS.CL.y)
  })
})
