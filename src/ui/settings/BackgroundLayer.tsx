import type { CSSProperties } from 'react'
import { findTheme } from '../../domain/theme/themes'
import { decorationUrl, TILE_SIZE } from './decoration'
import { hasBackground, useSettings } from './SettingsContext'
import './settings.css'

/**
 * 화면 전체 뒤에 깔리는 배경 층: 바탕(팀 색 그라데이션 또는 내 사진) → 장식(야구 소품 무늬, 아주 흐리게) → 반투명 막.
 * 카드·패널은 이 위에 불투명하게 그려진다. 휴대폰에서도 흔들리지 않게 고정 위치 요소로 둔다.
 */
export default function BackgroundLayer() {
  const ctx = useSettings()
  if (!ctx || !hasBackground(ctx.settings, ctx.backgroundUrl)) return null
  const theme = findTheme(ctx.settings.themeId)
  const base: CSSProperties = ctx.backgroundUrl
    ? { backgroundImage: `url("${ctx.backgroundUrl}")` }
    : theme.colors
      ? { backgroundImage: `linear-gradient(135deg, ${theme.colors[0]} 0%, ${theme.colors[1]} 100%)` }
      : {}

  return (
    <div className="app-bg" aria-hidden="true" data-testid="app-bg">
      <div className="app-bg-base" style={base} data-kind={ctx.backgroundUrl ? 'image' : theme.colors ? 'theme' : 'plain'} />
      {ctx.settings.decorations && (
        <div
          className="app-bg-deco"
          data-testid="app-bg-deco"
          style={{ maskImage: decorationUrl(), WebkitMaskImage: decorationUrl(), maskSize: `${TILE_SIZE}px`, WebkitMaskSize: `${TILE_SIZE}px` }}
        />
      )}
      <div className="app-bg-overlay" />
    </div>
  )
}
