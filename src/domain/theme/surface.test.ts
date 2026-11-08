import { describe, expect, it } from 'vitest'
import { contrastRatio, relativeLuminance } from './contrast'
import { BACKGROUND_TINT, themeBackground } from './surface'
import { BASE_COLORS, BASE_SOFT, SOFT_ON_BACKGROUND, THEMES } from './themes'

const AA = 4.5
const colored = THEMES.filter((t) => t.colors)

describe('팀 테마 배경색 (원색이 아닌 아주 연한·어두운 색)', () => {
  it('기본 테마는 배경색이 없다 (중립 바탕색 단색)', () => {
    expect(themeBackground(THEMES[0])).toBeNull()
  })

  it.each(colored.map((t) => [t.name, t] as const))('%s: 원색을 그대로 쓰지 않고, 라이트는 아주 연하게·다크는 아주 어둡게, 위가 조금 더 진하다', (_, t) => {
    const bg = themeBackground(t)!
    for (const mode of ['light', 'dark'] as const) {
      for (const c of [bg[mode].top, bg[mode].bottom]) {
        expect(t.colors!.map((x) => x.toLowerCase())).not.toContain(c.toLowerCase())
        expect(c.toLowerCase()).not.toBe(t.accent[mode].toLowerCase())
      }
    }
    // 바탕색과 가깝다: 라이트는 밝기 0.75 이상, 다크는 0.06 이하
    for (const c of [bg.light.top, bg.light.bottom]) expect(relativeLuminance(c), c).toBeGreaterThan(0.75)
    for (const c of [bg.dark.top, bg.dark.bottom]) expect(relativeLuminance(c), c).toBeLessThan(0.06)
    // 위에서 아래로 살짝 옅어진다 (아래가 바탕색에 더 가깝다)
    for (const mode of ['light', 'dark'] as const) {
      const paper = BASE_COLORS[mode].paper
      expect(contrastRatio(bg[mode].bottom, paper)).toBeLessThan(contrastRatio(bg[mode].top, paper))
    }
    expect(BACKGROUND_TINT.light.top).toBeLessThanOrEqual(0.15)
    expect(BACKGROUND_TINT.dark.top).toBeLessThanOrEqual(0.15)
  })
})

describe('배경 위 글자 대비 4.5:1 (모든 테마, 라이트·다크, 그라데이션 위·아래)', () => {
  for (const t of THEMES) {
    it(`${t.name}: 본문·보조 글자·강조색`, () => {
      const bg = themeBackground(t)
      for (const mode of ['light', 'dark'] as const) {
        const backs = bg ? [bg[mode].top, bg[mode].bottom] : [BASE_COLORS[mode].paper]
        for (const back of backs) {
          expect(contrastRatio(BASE_COLORS[mode].ink, back), `${mode} 본문 ${back}`).toBeGreaterThanOrEqual(AA)
          // 팀 테마 배경이면 배경용 보조 글자색(data-bg="on"), 기본 테마면 기본 보조 글자색
          const soft = bg ? SOFT_ON_BACKGROUND[mode] : BASE_SOFT[mode]
          expect(contrastRatio(soft, back), `${mode} 보조 ${back}`).toBeGreaterThanOrEqual(AA)
          expect(contrastRatio(t.accent[mode], back), `${mode} 강조 ${back}`).toBeGreaterThanOrEqual(AA)
        }
      }
    })
  }
})
