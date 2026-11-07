import { describe, expect, it } from 'vitest'
import { checkBackgroundImage, MAX_BACKGROUND_BYTES } from './background'
import { blend, contrastRatio } from './contrast'
import { BASE_COLORS, DEFAULT_THEME_ID, findTheme, OVERLAY_OPACITY, SOFT_ON_BACKGROUND, THEMES } from './themes'

const AA = 4.5
/** 막 아래 배경으로 올 수 있는 극단적인 색 (사진이 어떤 색이든 이보다 나쁘지 않다) */
const WORST_BACKGROUNDS = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF']

describe('대비 계산', () => {
  it('알려진 값과 같다', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2)
    expect(blend('#FFFFFF', '#000000', 0.5)).toBe('#808080')
  })
})

describe('팀 컬러 테마', () => {
  it('기본 + 색 이름 테마 10개, 이름에 구단 이름 없이 색 이름만', () => {
    expect(THEMES).toHaveLength(11)
    expect(THEMES[0].id).toBe(DEFAULT_THEME_ID)
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(11)
    expect(new Set(THEMES.map((t) => t.name)).size).toBe(11)
    for (const t of THEMES.slice(1)) expect(t.name, t.id).toMatch(/^[가-힣]+·[가-힣]+$/)
    const clubWords = /트윈스|베어스|히어로즈|랜더스|위즈|다이노스|타이거즈|라이온즈|자이언츠|이글스|LG|두산|키움|SSG|KT|NC|KIA|삼성|롯데|한화/
    for (const t of THEMES) expect(t.name, t.id).not.toMatch(clubWords)
  })

  it.each(THEMES.map((t) => [t.name, t] as const))('%s: 강조색이 패널·바탕 위에서 4.5:1 이상 (라이트·다크)', (_, t) => {
    for (const bg of [BASE_COLORS.light.surface, BASE_COLORS.light.paper]) expect(contrastRatio(t.accent.light, bg)).toBeGreaterThanOrEqual(AA)
    for (const bg of [BASE_COLORS.dark.surface, BASE_COLORS.dark.paper]) expect(contrastRatio(t.accent.dark, bg)).toBeGreaterThanOrEqual(AA)
  })

  it('모르는 테마 id는 기본 테마로', () => {
    expect(findTheme('없는-테마').id).toBe('default')
    expect(findTheme('navy-gold').name).toBe('남색·금색')
  })
})

describe('배경 위 글자 읽기 (반투명 막)', () => {
  for (const mode of ['light', 'dark'] as const) {
    it(`${mode}: 어떤 배경 위에서도 막 위의 본문·보조 글자가 4.5:1 이상`, () => {
      const { paper, ink } = BASE_COLORS[mode]
      for (const bg of WORST_BACKGROUNDS) {
        const onOverlay = blend(paper, bg, OVERLAY_OPACITY)
        expect(contrastRatio(ink, onOverlay), `${mode} 본문 ${bg}`).toBeGreaterThanOrEqual(AA)
        expect(contrastRatio(SOFT_ON_BACKGROUND[mode], onOverlay), `${mode} 보조 ${bg}`).toBeGreaterThanOrEqual(AA)
      }
    })

    it(`${mode}: 배경용 보조 글자색은 불투명 패널 위에서도 4.5:1 이상`, () => {
      expect(contrastRatio(SOFT_ON_BACKGROUND[mode], BASE_COLORS[mode].surface)).toBeGreaterThanOrEqual(AA)
    })
  }
})

describe('내 이미지 배경 검사', () => {
  it('PNG·JPG·WEBP, 10MB까지', () => {
    expect(checkBackgroundImage({ name: 'a.jpg', type: 'image/jpeg', size: 1000 })).toBeNull()
    expect(checkBackgroundImage({ name: 'b.webp', type: 'image/webp', size: MAX_BACKGROUND_BYTES })).toBeNull()
    expect(checkBackgroundImage({ name: 'c.gif', type: 'image/gif', size: 10 })).toContain('PNG, JPG, WEBP')
    expect(checkBackgroundImage({ name: 'd.png', type: 'image/png', size: MAX_BACKGROUND_BYTES + 1 })).toContain('10MB')
  })
})
