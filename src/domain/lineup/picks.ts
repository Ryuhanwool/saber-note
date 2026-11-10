// 포지션별 픽 순위: 가상 팬 라인업 + 내 저장된 라인업의 자리별 선수 집계
import type { PlayerId } from '../../data/types'
import type { League, Player } from '../players'
import { candidates, type Lineup } from './lineup'
import type { BullpenRoles } from './roles'
import { LINEUP_SLOTS, type LineupSlot } from './slots'

export type PickCounts = {
  /** 자리별 선수 픽 수 */
  counts: Record<LineupSlot, Map<PlayerId, number>>
  /** 자리별로 그 자리를 채운 라인업 수 (픽률의 분모) */
  voters: Record<LineupSlot, number>
}

/** 픽 수 = 가상 팬 라인업 + 내 저장된 라인업 (없으면 null) */
export function pickCounts(fans: readonly Lineup[], mine: Lineup | null): PickCounts {
  const counts = Object.fromEntries(LINEUP_SLOTS.map((s) => [s, new Map<PlayerId, number>()])) as PickCounts['counts']
  const voters = Object.fromEntries(LINEUP_SLOTS.map((s) => [s, 0])) as PickCounts['voters']
  for (const l of mine ? [...fans, mine] : fans) {
    for (const s of LINEUP_SLOTS) {
      const id = l.slots[s]
      if (!id) continue
      counts[s].set(id, (counts[s].get(id) ?? 0) + 1)
      voters[s]++
    }
  }
  return { counts, voters }
}

export type PickRow = {
  player: Player
  /** 1부터. 픽 수가 같으면 같은 순위 */
  rank: number
  count: number
  /** 0~100 */
  pct: number
  /** 내 저장된 라인업에서 이 자리에 고른 선수 */
  mine: boolean
}

/** 한 자리의 픽 순위 상위 limit명 (그 자리에 넣을 수 있는 선수가 적으면 있는 만큼). 같은 픽 수는 이름순 */
export function pickRanking(slot: LineupSlot, picks: PickCounts, league: League, roles: BullpenRoles, mine: Lineup | null, limit = 10): PickRow[] {
  const c = picks.counts[slot], n = picks.voters[slot]
  const rows = candidates(league, slot, roles)
    .map((player) => ({ player, count: c.get(player.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.player.name.localeCompare(b.player.name, 'ko'))
  let rank = 0
  return rows.slice(0, limit).map((r, i) => {
    if (i === 0 || r.count !== rows[i - 1].count) rank = i + 1
    return { ...r, rank, pct: n ? (r.count / n) * 100 : 0, mine: mine?.slots[slot] === r.player.id }
  })
}
