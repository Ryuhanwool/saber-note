// 홈 카드에 쓰는 계산: 응원 팀 가치 1위 선수(없으면 전체 1위)와 전날 대비 순위 변화
import type { League } from '../players'
import { ALL_PLAYERS, valueRanking, type RankRow } from '../value/ranking'

/**
 * 응원 팀에서 예상 가치가 가장 높은 선수의 순위표 줄 (순위·변화는 전체 순위 기준).
 * 응원 팀이 없거나 리그에 없는 구단이면 전체 1위. 선수가 없으면 null.
 */
export function teamTopRow(today: League, yesterday: League | null, team: string | null): { row: RankRow; scope: 'team' | 'all' } | null {
  const rows = valueRanking(today, yesterday, ALL_PLAYERS)
  const mine = team ? rows.find((r) => r.player.team === team) : undefined
  if (mine) return { row: mine, scope: 'team' }
  return rows[0] ? { row: rows[0], scope: 'all' } : null
}
