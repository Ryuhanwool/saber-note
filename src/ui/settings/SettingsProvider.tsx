import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { openSettingsStore } from '../../data/registry'
import { StorageFullError, type SettingsStore } from '../../data/source'
import { DEFAULT_DISPLAY_SETTINGS, type DisplaySettings } from '../../data/types'
import { checkBackgroundImage } from '../../domain/theme/background'
import { themeBackground } from '../../domain/theme/surface'
import { DEFAULT_THEME_ID, findTheme } from '../../domain/theme/themes'
import { hasBackground, SettingsContext, type SettingsValue } from './SettingsContext'

const toUrl = (blob: Blob | null) => (blob && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : null)

/** 화면 설정을 불러오고, 테마 강조색과 배경 여부를 문서 루트(:root)에 반영한다 */
/** 팀 테마가 :root에 넣는 CSS 변수 (기본 테마면 모두 지운다) */
const TEAM_VARS = [
  '--team-accent-light', '--team-accent-dark',
  '--team-bg-light-top', '--team-bg-light-bottom', '--team-bg-light-bar',
  '--team-bg-dark-top', '--team-bg-dark-bottom', '--team-bg-dark-bar',
]

export default function SettingsProvider({ store: given, children }: { store?: SettingsStore; children: ReactNode }) {
  const [store, setStore] = useState<SettingsStore | null>(given ?? null)
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS)
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)

  // 저장소 열기 → 설정·배경 이미지 불러오기
  useEffect(() => {
    let alive = true
    ;(async () => {
      const s = given ?? (await openSettingsStore())
      const [loaded, image] = await Promise.all([s.load(), s.loadBackground().catch(() => null)])
      if (!alive) return
      setStore(s)
      setSettings(loaded)
      setBackgroundUrl(toUrl(image))
    })()
    return () => {
      alive = false
    }
  }, [given])

  // 쓰지 않게 된 이미지 주소 정리
  useEffect(() => () => {
    if (backgroundUrl) URL.revokeObjectURL?.(backgroundUrl)
  }, [backgroundUrl])

  // 테마 강조색·배경색과 막 여부를 :root에 반영 (tokens.css가 --team-accent-*, --team-bg-*, data-bg를 읽는다)
  useEffect(() => {
    const root = document.documentElement
    const theme = findTheme(settings.themeId)
    const bg = themeBackground(theme, settings.bgStrength)
    const vars: Record<string, string> =
      theme.id === DEFAULT_THEME_ID || !bg
        ? {}
        : {
            '--team-accent-light': theme.accent.light, '--team-accent-dark': theme.accent.dark,
            '--team-bg-light-top': bg.light.top, '--team-bg-light-bottom': bg.light.bottom, '--team-bg-light-bar': bg.light.bar,
            '--team-bg-dark-top': bg.dark.top, '--team-bg-dark-bottom': bg.dark.bottom, '--team-bg-dark-bar': bg.dark.bar,
          }
    for (const name of TEAM_VARS) {
      if (vars[name]) root.style.setProperty(name, vars[name])
      else root.style.removeProperty(name)
    }
    root.dataset.bg = hasBackground(settings, backgroundUrl) ? 'on' : 'off'
    return () => {
      for (const name of TEAM_VARS) root.style.removeProperty(name)
      delete root.dataset.bg
    }
  }, [settings, backgroundUrl])

  const update = useCallback(
    async (patch: Partial<DisplaySettings>) => {
      const next = { ...settings, ...patch }
      setSettings(next)
      await store?.save(next).catch(() => {}) // 저장하지 못해도 이번 화면에는 반영한다
    },
    [settings, store],
  )

  const setBackground = useCallback(
    async (file: File) => {
      const problem = checkBackgroundImage(file)
      if (problem) return problem
      try {
        await store?.saveBackground(file)
      } catch (e) {
        return e instanceof StorageFullError ? '저장 공간이 가득 차서 배경을 저장하지 못했어요.' : '배경을 저장하지 못했어요.'
      }
      setBackgroundUrl(toUrl(file))
      return null
    },
    [store],
  )

  const resetBackground = useCallback(async () => {
    await store?.saveBackground(null).catch(() => {})
    setBackgroundUrl(null)
    await update({ themeId: DEFAULT_THEME_ID })
  }, [store, update])

  const value = useMemo<SettingsValue>(
    () => ({ settings, backgroundUrl, persistent: store?.persistent ?? true, update, setBackground, resetBackground }),
    [settings, backgroundUrl, store, update, setBackground, resetBackground],
  )
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
