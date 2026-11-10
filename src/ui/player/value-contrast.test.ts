import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../../domain/theme/contrast'
import { BASE_COLORS, BASE_SOFT, SOFT_ON_BACKGROUND } from '../../domain/theme/themes'

// 「선수 가치」 탭(value.css)이 쓰는 글자·바탕 조합. 패널은 불투명이라 팀 테마와 상관없이 이 조합만 본다.
// --chip은 tokens.css와 같은 값 (라이트 #E4EAE3, 다크 #243041)
const CHIP = { light: '#E4EAE3', dark: '#243041' }
const AA = 4.5

describe('선수 가치 탭 글자 대비 (WCAG AA)', () => {
  for (const m of ['light', 'dark'] as const) {
    it(`${m}: 본문·보조 글자가 패널·칩 바탕 위에서 4.5:1 이상 (배경 꾸밈 켜고 끈 보조색 모두)`, () => {
      const backs = [BASE_COLORS[m].surface, CHIP[m]]
      const texts = [BASE_COLORS[m].ink, BASE_SOFT[m], SOFT_ON_BACKGROUND[m]]
      for (const b of backs) for (const t of texts) expect(contrastRatio(t, b), `${t} on ${b}`).toBeGreaterThanOrEqual(AA)
    })
  }
})
