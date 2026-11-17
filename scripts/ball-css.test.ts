// 타구 애니메이션의 공(흰 공 + 진한 테두리)이 잔디·흙·패널 위에서 잘 보이는지 (라이트·다크). 팀 테마와 상관없는 색만 쓴다
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../src/domain/theme/contrast.ts'

const read = (p: string) => readFileSync(resolve(import.meta.dirname, p), 'utf8')
const tokens = read('../src/ui/shared/tokens.css')
const view = read('../src/ui/games/BallFlightView.tsx')
const css = read('../src/ui/games/games.css')
/** 라이트(첫 값)·다크(둘째 값) */
const pair = (name: string) => {
  const v = [...tokens.matchAll(new RegExp(`--${name}: (#[0-9A-Fa-f]{6})`, 'g'))].map((m) => m[1])
  return { light: v[0], dark: v[1] }
}
const GRAPHIC = 3

describe('타구 애니메이션의 공', () => {
  for (const mode of ['light', 'dark'] as const) {
    it(`${mode}: 공(흰 면 또는 진한 테두리)이 잔디·흙·패널·칩 위에서 3:1 이상`, () => {
      const ball = pair('ball')[mode]
      const edge = pair('ball-edge')[mode]
      for (const bg of ['grass', 'dirt', 'surface', 'chip']) {
        const back = pair(bg)[mode]
        const best = Math.max(contrastRatio(ball, back), contrastRatio(edge, back))
        expect(best, `${bg} ${back}`).toBeGreaterThanOrEqual(GRAPHIC)
      }
      // 흰 면과 테두리끼리도 구분된다
      expect(contrastRatio(ball, edge)).toBeGreaterThanOrEqual(GRAPHIC)
    })
  }

  it('공은 팀 강조색이 아니라 공 전용 토큰으로 그린다 (팀 테마와 상관없이 같은 대비), 색은 토큰만', () => {
    expect(view).toMatch(/className="bb-ball"[^>]*fill="var\(--ball\)" stroke="var\(--ball-edge\)"/)
    expect(view.replace(/\/\/.*$/gm, '')).not.toMatch(/#[0-9A-Fa-f]{3,6}\b/)
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/#[0-9A-Fa-f]{3,6}\b/)
  })
})
