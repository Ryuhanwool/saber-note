import type { CSSProperties } from 'react'
import { DEFAULT_THEME_ID } from '../../domain/theme/themes'
import { decorationUrl, TILE_SIZE } from './decoration'
import { hasOverlay, useSettings } from './SettingsContext'
import './settings.css'

/**
 * 화면 전체 뒤에 깔리는 배경 층: 바탕(팀 테마의 아주 연한 위→아래 그라데이션, 기본 테마는 단색, 또는 내 사진)
 * → 장식(야구 소품 무늬, 켰을 때만) → 반투명 막(내 사진·장식이 있을 때만).
 * 바탕색은 tokens.css의 --bg-top/--bg-bottom (SettingsProvider가 테마에 맞춰 넣는다).
 * 카드·패널은 이 위에 불투명하게 그려진다. 휴대폰에서도 흔들리지 않게 고정 위치 요소로 둔다.
 */
export default function BackgroundLayer() {
  const ctx = useSettings()
  if (!ctx) return null
  const base: CSSProperties = ctx.backgroundUrl ? { backgroundImage: `url("${ctx.backgroundUrl}")` } : {}

  return (
    <div className="app-bg" aria-hidden="true" data-testid="app-bg">
      <div className="app-bg-base" style={base} data-kind={ctx.backgroundUrl ? 'image' : ctx.settings.themeId === DEFAULT_THEME_ID ? 'plain' : 'theme'} />
      {ctx.settings.decorations && (
        <div
          className="app-bg-deco"
          data-testid="app-bg-deco"
          style={{ maskImage: decorationUrl(), WebkitMaskImage: decorationUrl(), maskSize: `${TILE_SIZE}px`, WebkitMaskSize: `${TILE_SIZE}px` }}
        />
      )}
      {hasOverlay(ctx.settings, ctx.backgroundUrl) && <div className="app-bg-overlay" data-testid="app-bg-overlay" />}
    </div>
  )
}
