// 가치 순위표의 상승·하락 색(tokens.css --up/--down)이 패널·칩 바탕 위에서 읽기 쉬운지, 휴대폰 메뉴 줄바꿈 규칙이 있는지
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../src/domain/theme/contrast.ts'
import { BASE_COLORS } from '../src/domain/theme/themes.ts'

const read = (p: string) => readFileSync(resolve(import.meta.dirname, p), 'utf8')
const tokens = read('../src/ui/shared/tokens.css')
const base = read('../src/ui/shared/base.css')
const ranking = read('../src/ui/ranking/ranking.css')

/** tokens.css에서 --name 값들 (라이트가 먼저, 다크 두 곳) */
const values = (name: string) => [...tokens.matchAll(new RegExp(`--${name}: (#[0-9A-Fa-f]{6})`, 'g'))].map((m) => m[1])
const CHIP = { light: '#E4EAE3', dark: '#243041' }

describe('가치 순위 색과 휴대폰 배치', () => {
  it('상승(빨강)·하락(파랑) 글자가 라이트·다크 패널과 칩 바탕 위에서 4.5:1 이상', () => {
    const [upL, upD1, upD2] = values('up'), [downL, downD1, downD2] = values('down')
    expect(upD1).toBe(upD2)
    expect(downD1).toBe(downD2)
    expect(tokens).toContain(`--chip: ${CHIP.light}`)
    expect(tokens).toContain(`--chip: ${CHIP.dark}`)
    for (const [mode, up, down] of [['light', upL, downL], ['dark', upD1, downD1]] as const) {
      for (const bg of [BASE_COLORS[mode].surface, CHIP[mode]]) {
        expect(contrastRatio(up, bg), `${mode} up on ${bg}`).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(down, bg), `${mode} down on ${bg}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('색만으로 구분하지 않는다: 상승·하락 칸은 기호(▲▼)와 숫자를 함께 쓴다 (CSS는 색만 정함)', () => {
    expect(ranking).toMatch(/\.rk-chg\.up\{color:var\(--up\)\}/)
    expect(ranking).toMatch(/\.rk-chg\.down\{color:var\(--down\)\}/)
    expect(ranking).not.toMatch(/#[0-9A-Fa-f]{3,6}\b/) // 색은 tokens.css에만
  })

  it('휴대폰 폭(480px 이하)에서는 메뉴 6개를 3칸 × 2줄로 보여 준다', () => {
    expect(base).toMatch(/@media \(max-width:480px\)\{\s*nav\{display:grid;grid-template-columns:repeat\(3,1fr\)/)
  })
})
