// 팀 테마 배경색: 강조색을 바탕색에 아주 조금 섞은 연한(다크는 어두운) 색.
import { blend } from './contrast'
import { BASE_COLORS, type Theme } from './themes'

/**
 * 팀 테마 배경: 강조색을 바탕색에 아주 조금 섞은 단색 (원색은 쓰지 않는다). 위에서 아래로 살짝 옅어진다.
 * 라이트는 강조색(라이트)을 연하게, 다크는 강조색(다크)을 어두운 바탕에 조금만 섞는다. 기본 테마는 중립 바탕색 그대로.
 * 이 배경 위의 보조 글자는 SOFT_ON_BACKGROUND(더 진한·밝은 보조색)를 쓴다 (data-bg="on")
 */
export const BACKGROUND_TINT = { light: { top: 0.08, bottom: 0.03 }, dark: { top: 0.12, bottom: 0.05 } }

export type ThemeBackground = Record<'light' | 'dark', { top: string; bottom: string }>

/** 테마의 배경 그라데이션 두 색 (라이트·다크). 기본 테마는 null (바탕색 단색) */
export function themeBackground(theme: Theme): ThemeBackground | null {
  if (!theme.colors) return null
  const mix = (mode: 'light' | 'dark') => ({
    top: blend(theme.accent[mode], BASE_COLORS[mode].paper, BACKGROUND_TINT[mode].top),
    bottom: blend(theme.accent[mode], BASE_COLORS[mode].paper, BACKGROUND_TINT[mode].bottom),
  })
  return { light: mix('light'), dark: mix('dark') }
}
