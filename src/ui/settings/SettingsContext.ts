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

/** 배경을 꾸몄는지 (팀 테마·내 사진·장식 중 하나라도): data-bg="on"이 되어 보조 글자색을 더 진하게(다크는 밝게) 쓴다 */
export const hasBackground = (s: DisplaySettings, backgroundUrl: string | null) => s.themeId !== DEFAULT_THEME_ID || hasOverlay(s, backgroundUrl)

/**
 * 배경 위에 반투명 막을 까는지: 내 사진이나 야구 소품 장식이 있을 때만.
 * 팀 테마 배경은 바탕색에 아주 조금 섞은 색이라 막 없이도 글자 대비를 지킨다 (domain/theme 테스트).
 */
export const hasOverlay = (s: DisplaySettings, backgroundUrl: string | null) =>
  backgroundUrl !== null || s.decorations
