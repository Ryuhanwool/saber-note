// @vitest-environment jsdom
// 버그 재현 테스트: 팀 컬러 테마에서 야구 소품 장식을 켜면 배경 팀 색이 사라지고 기본 색으로 보였다
// (원인: 장식과 함께 깔리는 반투명 막이 중립 바탕색 85%로 팀 색을 덮었다). 장식을 켜도 팀 색 변수와 막 색이 팀 색 그대로인지 확인한다.
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemorySettings } from './data/settings/memory'
import { BACKGROUND_STRENGTHS } from './data/types'
import { themeBackground } from './domain/theme/surface'
import { THEMES } from './domain/theme/themes'
import BackgroundLayer from './ui/settings/BackgroundLayer'
import SettingsProvider from './ui/settings/SettingsProvider'

const root = document.documentElement
const VARS = ['top', 'bottom', 'bar'].flatMap((k) => [`--team-bg-light-${k}`, `--team-bg-dark-${k}`])

async function show(themeId: string, bgStrength: (typeof BACKGROUND_STRENGTHS)[number], decorations: boolean) {
  render(
    <SettingsProvider store={createMemorySettings({ themeId, bgStrength, decorations })}>
      <BackgroundLayer />
    </SettingsProvider>,
  )
  const layer = await screen.findByTestId('app-bg')
  // 설정을 불러온 뒤 (처음 그릴 때는 기본값)
  if (themeId !== 'default') await expect.poll(() => root.style.getPropertyValue('--team-accent-light')).not.toBe('')
  const vars = Object.fromEntries(VARS.map((v) => [v, root.style.getPropertyValue(v)]))
  const result = {
    vars,
    order: [...layer.children].map((el) => el.className),
    over: screen.queryByTestId('app-bg-overlay')?.getAttribute('data-over') ?? null,
    decoOn: screen.queryByTestId('app-bg-deco')?.getAttribute('data-on') ?? null,
  }
  cleanup()
  return result
}

afterEach(cleanup)

describe('장식을 켜도 배경 팀 색이 바뀌지 않는다 (모든 테마 × 배경 진하기 3단계, 라이트·다크 변수)', () => {
  for (const strength of BACKGROUND_STRENGTHS) {
    for (const t of THEMES) {
      it(`${strength} · ${t.name}`, async () => {
        const off = await show(t.id, strength, false)
        const on = await show(t.id, strength, true)
        expect(on.vars).toEqual(off.vars)
        const bg = themeBackground(t, strength)
        if (bg) {
          expect(on.vars['--team-bg-light-top']).toBe(bg.light.top)
          expect(on.vars['--team-bg-dark-top']).toBe(bg.dark.top)
        }
        // 팀 색 → 장식 무늬 → 반투명 막 순서. 막은 바탕과 같은 팀 색(기본 테마는 바탕색과 같은 중립색)이라 팀 색을 덮지 않는다
        expect(on.order).toEqual(['app-bg-base', 'app-bg-deco', 'app-bg-overlay'])
        expect(on.over).toBe('theme')
        expect(on.decoOn).toBe(t.colors ? 'theme' : 'plain')
        expect(off.over).toBeNull()
      })
    }
  }
})
