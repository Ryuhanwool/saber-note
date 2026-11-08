// CSS(tokens.css)와 domain의 읽기 기준 값이 같은지 확인한다 (대비 계산 테스트는 domain 값으로 하므로)
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BASE_COLORS, BASE_SOFT, OVERLAY_OPACITY, SOFT_ON_BACKGROUND, THEMES } from '../src/domain/theme/themes.ts'

const css = readFileSync(resolve(import.meta.dirname, '../src/ui/shared/tokens.css'), 'utf8')

describe('tokens.css와 domain/theme 값이 같다', () => {
  it('반투명 막 불투명도', () => {
    expect(css).toContain(`var(--paper) ${Math.round(OVERLAY_OPACITY * 100)}%`)
  })
  it('배경을 꾸몄을 때의 보조 글자색 (라이트·다크)', () => {
    expect(css).toContain(`:root[data-bg="on"] { --soft: ${SOFT_ON_BACKGROUND.light}; }`)
    expect(css).toContain(`[data-bg="on"]:not([data-theme="light"]) { --soft: ${SOFT_ON_BACKGROUND.dark}; }`)
  })
  it('기본 테마 강조색 (팀 테마가 없을 때)', () => {
    expect(css).toContain(`var(--team-accent-light, ${THEMES[0].accent.light})`)
    expect(css).toContain(`var(--team-accent-dark, ${THEMES[0].accent.dark})`)
  })
  it('대비 계산에 쓴 바탕·패널·본문 색', () => {
    for (const mode of ['light', 'dark'] as const) {
      const { paper, surface, ink } = BASE_COLORS[mode]
      expect(css).toContain(`--paper: ${paper}; --surface: ${surface}; --ink: ${ink};`)
    }
  })
  it('막이 없을 때의 보조 글자색 (라이트·다크)', () => {
    expect(css).toContain(`--ink: ${BASE_COLORS.light.ink}; --soft: ${BASE_SOFT.light};`)
    expect(css).toContain(`--ink: ${BASE_COLORS.dark.ink}; --soft: ${BASE_SOFT.dark};`)
  })
  it('화면 배경·상단 메뉴 바는 팀 테마 배경색 변수를 읽고, 없으면 바탕색·패널색 (바둑판 무늬 없음)', () => {
    expect(css).toContain('--bg-top: var(--team-bg-light-top, var(--paper)); --bg-bottom: var(--team-bg-light-bottom, var(--paper));')
    expect(css.match(/--bg-top: var\(--team-bg-dark-top, var\(--paper\)\); --bg-bottom: var\(--team-bg-dark-bottom, var\(--paper\)\);/g)).toHaveLength(2)
    expect(css).toContain('--bar-bg: var(--team-bg-light-bar, var(--surface));')
    expect(css.match(/--bar-bg: var\(--team-bg-dark-bar, var\(--surface\)\);/g)).toHaveLength(2)
    expect(readFileSync(resolve(import.meta.dirname, '../src/ui/shared/base.css'), 'utf8')).toMatch(/header\{[^}]*background:var\(--bar-bg\)/)
    for (const file of ['tokens.css', 'base.css']) {
      expect(readFileSync(resolve(import.meta.dirname, '../src/ui/shared', file), 'utf8')).not.toContain('--grid')
    }
    expect(readFileSync(resolve(import.meta.dirname, '../src/ui/settings/settings.css'), 'utf8')).not.toContain('--grid')
  })
})
