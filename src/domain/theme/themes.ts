// 응원 팀 배경: 팀 컬러 테마 목록과 배경을 꾸몄을 때의 읽기 기준 (테마 배경색은 surface.ts).
// KBO 구단 대표 색 조합을 참고했지만, 이름은 색 이름만 쓰고 구단 이름·로고·마스코트는 쓰지 않는다.

export type ThemeId =
  | 'default' | 'crimson-black' | 'navy-red' | 'burgundy-gray' | 'red-yellow' | 'black-red'
  | 'navy-gold' | 'scarlet-black' | 'blue-white' | 'deepnavy-sky' | 'orange-black'

export type Theme = {
  id: ThemeId
  /** 화면에 보이는 이름 (색 이름만) */
  name: string
  /** 배경 그라데이션 두 색. 기본 테마는 null (지금 배경 그대로) */
  colors: [string, string] | null
  /** 강조색(메뉴 밑줄, 계산 기준 표시, 앞서는 쪽 등). 라이트·다크 모드마다 따로 정해 대비를 지킨다 */
  accent: { light: string; dark: string }
}

export const THEMES: Theme[] = [
  { id: 'default', name: '기본', colors: null, accent: { light: '#C8102E', dark: '#FF5A6E' } },
  { id: 'crimson-black', name: '진홍·검정', colors: ['#A50034', '#1A1A1A'], accent: { light: '#A50034', dark: '#FF7AA2' } },
  { id: 'navy-red', name: '남색·빨강', colors: ['#131230', '#D0021B'], accent: { light: '#1F2A6B', dark: '#9AAAFF' } },
  { id: 'burgundy-gray', name: '버건디·회색', colors: ['#820024', '#8A8D8F'], accent: { light: '#820024', dark: '#FF8AA8' } },
  { id: 'red-yellow', name: '빨강·노랑', colors: ['#CE0E2D', '#FFB81C'], accent: { light: '#B3001E', dark: '#FF7B7B' } },
  { id: 'black-red', name: '검정·빨강', colors: ['#1B1B1B', '#EC1C24'], accent: { light: '#C4161C', dark: '#FF6B6F' } },
  { id: 'navy-gold', name: '남색·금색', colors: ['#1D3B6E', '#C5A15A'], accent: { light: '#1D3B6E', dark: '#E2C27A' } },
  { id: 'scarlet-black', name: '다홍·검정', colors: ['#EA0029', '#06141F'], accent: { light: '#C2001F', dark: '#FF7A6E' } },
  { id: 'blue-white', name: '파랑·흰색', colors: ['#074CA1', '#F4F7FB'], accent: { light: '#074CA1', dark: '#86B8FF' } },
  { id: 'deepnavy-sky', name: '감청·하늘', colors: ['#041E42', '#6CACE4'], accent: { light: '#0B3D7A', dark: '#8CC8F2' } },
  { id: 'orange-black', name: '주황·검정', colors: ['#FF6600', '#1A1A1A'], accent: { light: '#A84300', dark: '#FF9A4D' } },
]

export const DEFAULT_THEME_ID: ThemeId = 'default'

export const findTheme = (id: string): Theme => THEMES.find((t) => t.id === id) ?? THEMES[0]

/**
 * 내 사진이나 장식을 깔았을 때 그 위에 덮는 반투명 막의 불투명도 (팀 테마 배경만일 때는 막을 깔지 않는다).
 * ui/shared/tokens.css의 --bg-overlay와 같은 값이어야 한다 (ui 테스트에서 확인).
 */
export const OVERLAY_OPACITY = 0.85

/**
 * 막을 깔았을 때(내 사진·장식) 쓰는 보조 글자색. 막 아래 배경이 아주 어둡거나 밝아도 4.5:1을 지키도록 기본 보조색보다 진하게(다크는 밝게).
 * ui/shared/tokens.css의 [data-bg="on"] --soft와 같은 값이어야 한다.
 */
export const SOFT_ON_BACKGROUND = { light: '#46505E', dark: '#B0BAC6' }

/** 막이 없을 때의 보조 글자색 (ui/shared/tokens.css의 기본 --soft와 같은 값) */
export const BASE_SOFT = { light: '#5A6676', dark: '#97A3B1' }

/** 테마와 무관한 바탕색 (ui/shared/tokens.css와 같은 값) */
export const BASE_COLORS = {
  light: { paper: '#F2F5F0', surface: '#FFFFFF', ink: '#1E2A3A' },
  dark: { paper: '#121821', surface: '#1A2230', ink: '#E6EBF0' },
}

/** 칩 바탕색 (ui/shared/tokens.css --chip과 같은 값) */
export const CHIP_COLORS = { light: '#E4EAE3', dark: '#243041' }

/** 홈 「내 라인업」 띠: 라이트·다크 모두 어두운 띠에 밝은 글자 (ui/shared/tokens.css --band-bg·--band-ink와 같은 값) */
export const BAND_COLORS = { light: { bg: '#1E2A3A', ink: '#F2F5F0' }, dark: { bg: '#0A0F16', ink: '#E6EBF0' } }
