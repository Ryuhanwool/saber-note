// 홈 화면·아이콘 줄·아래쪽 탭 바 글자 대비 (WCAG AA): 모든 팀 컬러 테마 × 배경 진하기 3단계 × 라이트·다크.
// 글자는 4.5:1, 글자가 아닌 표시(새 것 점, 지금 탭 밑줄, 카드 아래 띠, 카드 그림, 레벨 막대)는 3:1.
import { describe, expect, it } from 'vitest'
import { BACKGROUND_STRENGTHS } from '../../data/types'
import { contrastRatio } from '../../domain/theme/contrast'
import { BACKGROUND_STRENGTH_LABELS, themeBackground, type Mode } from '../../domain/theme/surface'
import { BAND_COLORS, BASE_COLORS, BASE_SOFT, CHIP_COLORS, SOFT_ON_BACKGROUND, THEMES } from '../../domain/theme/themes'

// tokens.css 값과 같은지는 scripts/hub-css.test.ts가 확인한다
const MODES: Mode[] = ['light', 'dark']
const AA = 4.5
const GRAPHIC = 3
const CHIP = CHIP_COLORS

describe('홈·아이콘 줄·탭 바 글자 대비', () => {
  for (const mode of MODES) {
    const { surface, ink, paper } = BASE_COLORS[mode]
    const softs = [BASE_SOFT[mode], SOFT_ON_BACKGROUND[mode]]

    it(`${mode}: 카드·프로필 줄·새 소식 창(패널) 위 본문·보조 글자, 칩(레벨 배지·숫자 칩·카드 그림 바탕) 위 글자`, () => {
      for (const back of [surface, CHIP[mode]]) {
        for (const fg of [ink, ...softs]) expect(contrastRatio(fg, back), `${fg} on ${back}`).toBeGreaterThanOrEqual(AA)
      }
      // 가치 순위 카드의 ▲▼ (빨강·파랑)은 패널 위에서 순위표와 같다 (scripts/ranking-css.test.ts)
    })

    it(`${mode}: 내 라인업 띠(어두운 띠의 밝은 글자, 「라인업 편집」 버튼), 레벨 번호, 가운데 홈 탭`, () => {
      expect(contrastRatio(BAND_COLORS[mode].ink, BAND_COLORS[mode].bg)).toBeGreaterThanOrEqual(AA)
      expect(contrastRatio(paper, ink)).toBeGreaterThanOrEqual(AA) // .lv-no, 홈 탭 아이콘
    })

    for (const theme of THEMES) {
      for (const strength of BACKGROUND_STRENGTHS) {
        it(`${mode} · ${theme.name} · ${BACKGROUND_STRENGTH_LABELS[strength]}: 머리줄·탭 바 글자 4.5:1, 강조 표시 3:1`, () => {
          const bar = themeBackground(theme, strength)?.[mode].bar ?? surface
          // 팀 테마면 data-bg="on"이라 보조 글자는 진한 보조색 (기본 테마는 기본 보조색)
          const soft = theme.colors ? SOFT_ON_BACKGROUND[mode] : BASE_SOFT[mode]
          for (const fg of [ink, soft]) expect(contrastRatio(fg, bar), `탭 글자 ${fg} on ${bar}`).toBeGreaterThanOrEqual(AA)
          const accent = theme.accent[mode]
          // 새 것 점·지금 탭 밑줄(탭 바), 새 소식 점(아이콘 버튼 = 패널색), 카드 아래 띠·레벨 막대(패널), 카드 그림 강조(칩)
          for (const back of [bar, surface, CHIP[mode]]) expect(contrastRatio(accent, back), `강조 ${accent} on ${back}`).toBeGreaterThanOrEqual(GRAPHIC)
          // 가운데 홈 탭 동그라미는 탭 바와 구분된다
          expect(contrastRatio(ink, bar)).toBeGreaterThanOrEqual(GRAPHIC)
        })
      }
    }
  }
})
