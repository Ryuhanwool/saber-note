// 응원 팀(가상 구단) ↔ 팀 컬러 테마. 회원가입의 응원 팀 테마와 공식 스토어 상품 색이 같은 짝을 쓴다.
import { THEMES, type ThemeId } from './themes'

/**
 * 응원 팀 → 팀 컬러 테마. 구단이 나오는 순서대로 짝짓는다 (리그 구단 이름은 모른다).
 * 가상 리그: 한빛 수달스=남색·금색, 태백 산양스=버건디·회색, 청운 해오라기스=감청·하늘,
 * 금강 반딧불스=빨강·노랑, 남해 돌고래스=파랑·흰색, 북악 부엉이스=주황·검정
 */
export const TEAM_THEME_ORDER: readonly ThemeId[] = ['navy-gold', 'burgundy-gray', 'deepnavy-sky', 'red-yellow', 'blue-white', 'orange-black']

/** 구단 목록에서 이 구단의 테마 id. 목록에 없으면 null */
export function teamThemeId(teams: readonly string[], team: string): ThemeId | null {
  const i = teams.indexOf(team)
  return i < 0 ? null : TEAM_THEME_ORDER[i % TEAM_THEME_ORDER.length]
}

/** 테마의 두 색 (공식 스토어 상품 색) */
export function themeColors(themeId: string): { main: string; sub: string } {
  const t = THEMES.find((x) => x.id === themeId)
  if (!t?.colors) throw new Error(`색이 있는 테마가 아닙니다: ${themeId}`)
  return { main: t.colors[0], sub: t.colors[1] }
}
