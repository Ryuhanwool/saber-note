// CSS(tokens.css)와 domain의 읽기 기준 값이 같은지 확인한다 (대비 계산 테스트는 domain 값으로 하므로)
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BASE_COLORS, BASE_SOFT, OVERLAY_OPACITY, SOFT_ON_BACKGROUND, THEMES } from '../src/domain/theme/themes.ts'

const settingsCss = readFileSync(resolve(import.meta.dirname, '../src/ui/settings/settings.css'), 'utf8')
/** domain/theme/surface.ts DECORATION_OPACITY (surface.ts는 확장자 없는 import를 써서 여기서 직접 읽지 않는다) */
const DECORATION_OPACITY = 0.5

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
  it('장식을 켜도 팀 색이 바뀌지 않게: 막은 바탕과 같은 팀 색 그라데이션, 팀 테마의 무늬는 중립색', () => {
    const o = Math.round(OVERLAY_OPACITY * 100)
    expect(settingsCss).toContain(`.app-bg-overlay[data-over="theme"]{\n  background-color:transparent;\n  background-image:linear-gradient(180deg,color-mix(in srgb,var(--bg-top) ${o}%,transparent),color-mix(in srgb,var(--bg-bottom) ${o}%,transparent));`)
    expect(settingsCss).toMatch(new RegExp(`\\.app-bg-deco\\{[^}]*opacity:${String(DECORATION_OPACITY).replace(/^0/, '')}[;}]`))
    expect(settingsCss).toContain('.app-bg-deco[data-on="theme"]{background-color:var(--deco-neutral)}')
    // 무늬 중립색: 라이트는 패널색(흰색), 다크는 어두운 바탕색 (decorationColor와 같다)
    expect(css).toContain('--deco-neutral: var(--surface);')
    expect(css.match(/--deco-neutral: var\(--paper\);/g)).toHaveLength(2)
  })
})
