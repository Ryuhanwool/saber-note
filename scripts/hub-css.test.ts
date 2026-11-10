// 홈 화면·아이콘 줄·탭 바 CSS(hub.css)와 색 토큰(tokens.css). 대비 계산은 src/ui/hub/hub-contrast.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BAND_COLORS, CHIP_COLORS } from '../src/domain/theme/themes.ts'

const read = (p: string) => readFileSync(resolve(import.meta.dirname, p), 'utf8')
const tokens = read('../src/ui/shared/tokens.css')
const hubCss = read('../src/ui/hub/hub.css')

describe('tokens.css와 domain 값이 같다 (대비 테스트가 domain 값으로 계산하므로)', () => {
  it('칩 바탕색, 내 라인업 띠 색 (라이트·다크)', () => {
    expect(tokens).toContain(`--chip: ${CHIP_COLORS.light};`)
    expect(tokens).toContain(`--chip: ${CHIP_COLORS.dark};`)
    expect(tokens).toContain(`--band-bg: ${BAND_COLORS.light.bg}; --band-ink: ${BAND_COLORS.light.ink};`)
    expect(tokens).toContain(`--band-bg: ${BAND_COLORS.dark.bg}; --band-ink: ${BAND_COLORS.dark.ink};`)
  })
})

describe('hub.css는 색을 직접 쓰지 않는다 (tokens.css 변수만)', () => {
  it('16진 색 없음', () => {
    expect(hubCss.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/#[0-9A-Fa-f]{3,6}\b/)
  })
  it('탭 바는 하단 안전 영역을 피하고, 휴대폰 폭에서 내용 아래 여백을 탭 바 높이만큼 둔다', () => {
    expect(hubCss).toMatch(/\.tabbar\{[^}]*env\(safe-area-inset-bottom/)
    expect(hubCss).toMatch(/main\{padding-bottom:calc\(var\(--tabbar-h\) \+ 32px \+ env\(safe-area-inset-bottom,0px\)\)\}/)
  })
  it('아이콘 버튼과 탭은 손가락으로 누르기 충분한 크기 (44px 이상)', () => {
    expect(hubCss).toMatch(/\.icon-btn\{[^}]*width:44px;height:44px/)
    expect(hubCss).toMatch(/--tabbar-h:64px/)
  })
})
