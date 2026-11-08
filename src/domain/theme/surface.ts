// 팀 테마 배경색: 강조색을 바탕색에 섞은 색 (원색은 쓰지 않는다). 「배경 진하기」 3단계로 섞는 정도를 고른다.
// 배경 위에 바로 놓인 글자(본문·배경용 보조 글자)가 4.5:1을 못 지키는 조합은, 지킬 수 있는 만큼만 섞도록 그 단계의 비율을 줄인다.
import type { BackgroundStrength } from '../../data/types'
import { blend, contrastRatio } from './contrast'
import { BASE_COLORS, OVERLAY_OPACITY, SOFT_ON_BACKGROUND, type Theme } from './themes'

export type Mode = 'light' | 'dark'
const MODES: Mode[] = ['light', 'dark']
const AA = 4.5

export const BACKGROUND_STRENGTH_LABELS: Record<BackgroundStrength, string> = { soft: '연하게', medium: '보통', strong: '진하게' }

/**
 * 단계별로 강조색을 섞는 비율 (위 → 아래로 살짝 옅어진다). 라이트는 연한 바탕에, 다크는 어두운 바탕에 섞는다.
 * 연하게 = 처음 정한 정도, 보통 = 약 2.5배(기본값), 진하게 = 약 3.5배(대비를 못 지키면 줄인다)
 */
export const BACKGROUND_TINT: Record<BackgroundStrength, Record<Mode, { top: number; bottom: number }>> = {
  soft: { light: { top: 0.08, bottom: 0.03 }, dark: { top: 0.12, bottom: 0.05 } },
  medium: { light: { top: 0.2, bottom: 0.08 }, dark: { top: 0.28, bottom: 0.11 } },
  strong: { light: { top: 0.3, bottom: 0.12 }, dark: { top: 0.4, bottom: 0.16 } },
}

/** 배경 위에 바로 놓이는 글자색: 본문과 배경용 보조 글자 (강조색 글자는 카드·패널 안에만 둔다) */
export const textOnBackground = (mode: Mode) => [BASE_COLORS[mode].ink, SOFT_ON_BACKGROUND[mode]]

const readable = (back: string, mode: Mode) => textOnBackground(mode).every((fg) => contrastRatio(fg, back) >= AA)
const round2 = (x: number) => Math.round(x * 100) / 100

export type TintResult = {
  /** 실제로 섞은 비율 (대비 때문에 줄였으면 목표보다 작다) */
  top: number
  bottom: number
  /** 화면 배경 위·아래 색, 상단 메뉴 바 색 */
  colors: { top: string; bottom: string; bar: string }
}

/** 한 테마·모드·단계의 배경색. 위쪽·메뉴 바 위 글자가 4.5:1을 지킬 때까지 0.01씩 줄인다 */
export function tint(theme: Theme, mode: Mode, strength: BackgroundStrength): TintResult {
  const target = BACKGROUND_TINT[strength][mode]
  const { paper, surface } = BASE_COLORS[mode]
  const accent = theme.accent[mode]
  for (let top = target.top; top > 0; top = round2(top - 0.01)) {
    const bottom = Math.round(top * (target.bottom / target.top) * 1000) / 1000
    const colors = { top: blend(accent, paper, top), bottom: blend(accent, paper, bottom), bar: blend(accent, surface, bottom) }
    if ([colors.top, colors.bottom, colors.bar].every((c) => readable(c, mode))) return { top, bottom, colors }
  }
  return { top: 0, bottom: 0, colors: { top: paper, bottom: paper, bar: surface } }
}

export type ThemeBackground = Record<Mode, { top: string; bottom: string; bar: string }>

/** 테마의 배경 그라데이션 두 색과 상단 메뉴 바 색 (라이트·다크). 기본 테마는 null (중립 단색, 메뉴 바는 흰·패널색) */
export function themeBackground(theme: Theme, strength: BackgroundStrength): ThemeBackground | null {
  if (!theme.colors) return null
  const [light, dark] = MODES.map((m) => tint(theme, m, strength).colors)
  return { light, dark }
}

/** 야구 소품 장식 무늬의 불투명도 (ui/settings/settings.css .app-bg-deco opacity와 같은 값) */
export const DECORATION_OPACITY = 1

/**
 * 장식 무늬 색: 팀 테마에서는 중립색(라이트는 패널색 흰색, 다크는 어두운 바탕색)으로 칠해 무늬 자리가 바탕 쪽으로 옅어지게 한다
 * (팀 색 배경 위 글자 대비를 떨어뜨리지 않는다). 기본 테마는 바탕이 중립색이라 강조색으로 칠한다.
 * ui/shared/tokens.css의 --deco-neutral과 같은 값.
 */
export const decorationColor = (theme: Theme, mode: Mode) =>
  theme.colors ? (mode === 'light' ? BASE_COLORS.light.surface : BASE_COLORS.dark.paper) : theme.accent[mode]

/**
 * 장식을 켰을 때 무늬가 지나가는 자리의 색: 바탕 → 무늬(무늬 색, DECORATION_OPACITY) → 막(바탕과 같은 색, OVERLAY_OPACITY).
 * 무늬가 없는 자리는 막과 바탕이 같은 색이라 바탕색 그대로다.
 */
export const patternPixel = (back: string, deco: string) => blend(back, blend(deco, back, DECORATION_OPACITY), OVERLAY_OPACITY)

/**
 * 화면에 실제로 보이는 배경 (CSS 층을 겹친 결과): 장식을 꺼도 켜도 무늬가 없는 자리는 바탕색과 같다.
 * 장식을 켜면 무늬 자리(pattern)만 무늬 색이 조금 섞인다.
 */
export function visibleBackground(theme: Theme, mode: Mode, strength: BackgroundStrength, decorations: boolean) {
  const bg = themeBackground(theme, strength)?.[mode] ?? { top: BASE_COLORS[mode].paper, bottom: BASE_COLORS[mode].paper }
  // 막(OVERLAY_OPACITY)을 바탕과 같은 색으로 덮으므로 무늬 밖은 바탕색 그대로
  const plain = (c: string) => (decorations ? blend(c, c, OVERLAY_OPACITY) : c.toLowerCase())
  const deco = decorationColor(theme, mode)
  return {
    top: plain(bg.top),
    bottom: plain(bg.bottom),
    pattern: decorations ? { top: patternPixel(bg.top, deco), bottom: patternPixel(bg.bottom, deco) } : null,
  }
}
