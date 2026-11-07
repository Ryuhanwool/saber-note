import { createContext, useContext } from 'react'
import type { DisplaySettings } from '../../data/types'
import { DEFAULT_THEME_ID } from '../../domain/theme/themes'

export type SettingsValue = {
  settings: DisplaySettings
  /** 내 배경 이미지 주소. 없으면 null */
  backgroundUrl: string | null
  /** 새로고침해도 설정이 남는지 */
  persistent: boolean
  update(patch: Partial<DisplaySettings>): Promise<void>
  /** 내 이미지를 배경으로. 검사에 걸리면 이유를 돌려준다 */
  setBackground(file: File): Promise<string | null>
  /** 기본 배경으로: 내 이미지를 지우고 기본 테마로 */
  resetBackground(): Promise<void>
}

/** 설정 제공자가 없으면 null (테스트 등). 화면은 기본 설정으로 그린다 */
export const SettingsContext = createContext<SettingsValue | null>(null)

export const useSettings = () => useContext(SettingsContext)

/** 배경을 꾸몄는지 (팀 색·내 사진·장식 중 하나라도) */
export const hasBackground = (s: DisplaySettings, backgroundUrl: string | null) =>
  s.themeId !== DEFAULT_THEME_ID || backgroundUrl !== null || s.decorations
