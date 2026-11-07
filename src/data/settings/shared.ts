import { DEFAULT_DISPLAY_SETTINGS, type DisplaySettings } from '../types'

/** 저장된 값에서 알맞은 것만 골라 기본값 위에 얹는다 (예전 값·망가진 값에도 안전하게) */
export function normalizeSettings(raw: unknown): DisplaySettings {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    themeId: typeof o.themeId === 'string' ? o.themeId : DEFAULT_DISPLAY_SETTINGS.themeId,
    decorations: typeof o.decorations === 'boolean' ? o.decorations : DEFAULT_DISPLAY_SETTINGS.decorations,
    maskProfanity: typeof o.maskProfanity === 'boolean' ? o.maskProfanity : DEFAULT_DISPLAY_SETTINGS.maskProfanity,
  }
}
