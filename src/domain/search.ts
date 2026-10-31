import type { League, Player } from './players'

/** 이름이나 팀 이름에 검색어가 들어간 선수 (데모와 같은 규칙: 앞뒤 공백 무시, 부분 일치) */
export function searchPlayers(league: League, query: string, limit = 8): Player[] {
  const q = query.trim()
  if (!q) return []
  return [...league.hitters, ...league.pitchers].filter((p) => p.name.includes(q) || p.team.includes(q)).slice(0, limit)
}

/** WAR 높은 순 */
export function topByWar<P extends Player>(players: readonly P[], n: number): P[] {
  return [...players].sort((a, b) => b.m.WAR - a.m.WAR).slice(0, n)
}
