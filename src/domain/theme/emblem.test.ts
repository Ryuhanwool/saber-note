import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast'
import { EMBLEM_MIN_CONTRAST, emblemColors, TEAM_THEME_ORDER, themeColors } from './teams'

describe('구단 엠블럼 색', () => {
  for (const id of TEAM_THEME_ORDER) {
    it(`${id}: 바탕은 팀 주색, 동물 그림은 바탕과 3:1 이상`, () => {
      const c = emblemColors(id)
      expect(c.bg).toBe(themeColors(id).main)
      expect(contrastRatio(c.fg, c.bg)).toBeGreaterThanOrEqual(EMBLEM_MIN_CONTRAST)
    })
  }
  it('보조색이 바탕과 잘 구분되면 동물을 보조색으로 그린다', () => {
    expect(emblemColors('blue-white').fg).toBe(themeColors('blue-white').sub)
    expect(emblemColors('orange-black').fg).toBe(themeColors('orange-black').sub)
  })
})
