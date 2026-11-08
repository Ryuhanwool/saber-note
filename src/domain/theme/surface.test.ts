import { describe, expect, it } from 'vitest'
import { BACKGROUND_STRENGTHS, type BackgroundStrength } from '../../data/types'
import { contrastRatio, relativeLuminance } from './contrast'
import { BACKGROUND_STRENGTH_LABELS, BACKGROUND_TINT, textOnBackground, themeBackground, tint } from './surface'
import { BASE_COLORS, BASE_SOFT, THEMES } from './themes'

const AA = 4.5
const MODES = ['light', 'dark'] as const
const colored = THEMES.filter((t) => t.colors)

describe('배경 진하기 3단계', () => {
  it('연하게·보통·진하게. 보통은 연하게의 2~3배, 진하게는 보통보다 진하다', () => {
    expect(BACKGROUND_STRENGTHS.map((s) => BACKGROUND_STRENGTH_LABELS[s])).toEqual(['연하게', '보통', '진하게'])
    expect(BACKGROUND_TINT.soft).toEqual({ light: { top: 0.08, bottom: 0.03 }, dark: { top: 0.12, bottom: 0.05 } }) // 처음 정한 정도
    for (const m of MODES) {
      const ratio = BACKGROUND_TINT.medium[m].top / BACKGROUND_TINT.soft[m].top
      expect(ratio).toBeGreaterThanOrEqual(2)
      expect(ratio).toBeLessThanOrEqual(3)
      expect(BACKGROUND_TINT.strong[m].top).toBeGreaterThan(BACKGROUND_TINT.medium[m].top)
    }
  })

  it('기본 테마는 배경색이 없다 (중립 단색, 메뉴 바도 기본색)', () => {
    for (const s of BACKGROUND_STRENGTHS) expect(themeBackground(THEMES[0], s)).toBeNull()
  })

  it('연하게·보통은 모든 테마에서 정한 비율 그대로, 진하게는 대비 때문에 줄어도 보통보다 진하다', () => {
    for (const t of colored) {
      for (const m of MODES) {
        expect(tint(t, m, 'soft').top, `${t.name} ${m}`).toBe(BACKGROUND_TINT.soft[m].top)
        expect(tint(t, m, 'medium').top, `${t.name} ${m}`).toBe(BACKGROUND_TINT.medium[m].top)
        const strong = tint(t, m, 'strong').top
        expect(strong, `${t.name} ${m}`).toBeGreaterThan(BACKGROUND_TINT.medium[m].top)
        expect(strong).toBeLessThanOrEqual(BACKGROUND_TINT.strong[m].top)
      }
    }
  })
})

describe.each(BACKGROUND_STRENGTHS.map((s) => [BACKGROUND_STRENGTH_LABELS[s], s] as const))('배경 진하기 %s', (_, strength: BackgroundStrength) => {
  it.each(colored.map((t) => [t.name, t] as const))('%s: 원색은 쓰지 않고, 위가 조금 더 진하다. 라이트는 밝게·다크는 어둡게', (_, t) => {
    const bg = themeBackground(t, strength)!
    for (const m of MODES) {
      for (const c of [bg[m].top, bg[m].bottom, bg[m].bar]) {
        expect(t.colors!.map((x) => x.toLowerCase())).not.toContain(c.toLowerCase())
        expect(c.toLowerCase()).not.toBe(t.accent[m].toLowerCase())
      }
      const paper = BASE_COLORS[m].paper
      expect(contrastRatio(bg[m].bottom, paper)).toBeLessThan(contrastRatio(bg[m].top, paper))
    }
    for (const c of [bg.light.top, bg.light.bottom, bg.light.bar]) expect(relativeLuminance(c), c).toBeGreaterThan(0.45)
    for (const c of [bg.dark.top, bg.dark.bottom, bg.dark.bar]) expect(relativeLuminance(c), c).toBeLessThan(0.12)
  })

  it.each(THEMES.map((t) => [t.name, t] as const))('%s: 배경 위에 바로 놓인 글자(본문·보조)가 배경 위·아래와 메뉴 바에서 4.5:1 이상 (라이트·다크)', (_, t) => {
    const bg = themeBackground(t, strength)
    for (const m of MODES) {
      const backs = bg ? [bg[m].top, bg[m].bottom, bg[m].bar] : [BASE_COLORS[m].paper, BASE_COLORS[m].surface]
      // 기본 테마는 data-bg="off"면 기본 보조색, 팀 테마는 배경용 보조색을 쓴다 (둘 다 확인)
      for (const back of backs) {
        const fgs = bg ? textOnBackground(m) : [...textOnBackground(m), BASE_SOFT[m]]
        for (const fg of fgs) expect(contrastRatio(fg, back), `${m} ${fg} on ${back}`).toBeGreaterThanOrEqual(AA)
      }
      // 강조색은 카드·패널 안 글자에만 쓰고, 메뉴 바에서는 선택한 메뉴 밑줄(장식)에 쓴다
      if (bg) expect(contrastRatio(t.accent[m], BASE_COLORS[m].surface)).toBeGreaterThanOrEqual(AA)
    }
  })
})
