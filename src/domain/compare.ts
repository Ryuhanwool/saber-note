import type { Num } from '../data/types'
import { metricDef, type MetricKey } from './catalog'
import { metricValue } from './percentile'
import type { Player, PlayerType } from './players'

export const COMPARE_KEYS: Record<PlayerType, MetricKey[]> = {
  H: ['WAR', 'wrcp', 'ops', 'woba', 'bsr', 'drs', 'bbp', 'kp'],
  P: ['WAR', 'era', 'fip', 'whip', 'pk', 'pbb'],
}

export type Side = 'a' | 'b'
export type CompareRow = { key: MetricKey; a: Num; b: Num; winner: Side | null }

export type CompareResult =
  | { ok: false; reason: 'type-mismatch' | 'same-player' }
  | { ok: true; rows: CompareRow[]; wins: Record<Side, number>; leader: Side | null }

/** 지표 하나에서 앞서는 쪽. 한쪽이라도 값이 없거나, 같거나, 좋고 나쁨이 없는 지표면 null */
export function rowWinner(key: MetricKey, a: Num, b: Num): Side | null {
  const { better } = metricDef(key)
  if (a === null || b === null || a === b || better === null) return null
  return (better === 'higher' ? a > b : a < b) ? 'a' : 'b'
}

/**
 * isAvailable: 데이터 출처가 주지 않는 지표는 비교 줄에서 뺀다 (예: MLB에는 DRS가 없다).
 * 보통 `(k) => metricAvailable(league, k)`를 넘긴다.
 */
export function comparePlayers(A: Player, B: Player, isAvailable: (key: MetricKey) => boolean = () => true): CompareResult {
  if (A.type !== B.type) return { ok: false, reason: 'type-mismatch' }
  if (A.id === B.id) return { ok: false, reason: 'same-player' }
  const rows = COMPARE_KEYS[A.type].filter(isAvailable).map((key) => {
    const a = metricValue(A, key), b = metricValue(B, key)
    return { key, a, b, winner: rowWinner(key, a, b) }
  })
  const wins = { a: rows.filter((r) => r.winner === 'a').length, b: rows.filter((r) => r.winner === 'b').length }
  return { ok: true, rows, wins, leader: wins.a === wins.b ? null : wins.a > wins.b ? 'a' : 'b' }
}
