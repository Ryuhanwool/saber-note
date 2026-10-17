import type { Num } from '../data/types'
import { metricDef, type MetricDef, type MetricKey } from './catalog'
import { isMissing, presentNumbers } from './missing'
import type { League, Player, PlayerType } from './players'

/** 값 있는 숫자의 평균. 하나도 없으면 null */
export function meanOfPresent(values: readonly unknown[]): number | null {
  const xs = presentNumbers(values)
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))

/** 정렬된 배열에서 x보다 작은 값의 개수 */
function countBelow(sorted: readonly number[], x: number): number {
  let lo = 0, hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < x) lo = mid + 1
    else hi = mid
  }
  return lo
}

function countAtMost(sorted: readonly number[], x: number): number {
  let lo = 0, hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] <= x) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * 백분위(1~99, 클수록 좋음). 같은 값은 절반만 아래로 센다.
 * sorted에는 값 있는 숫자만 오름차순으로 들어 있어야 한다.
 */
function percentileInSorted(value: number, sorted: readonly number[], better: 'higher' | 'lower'): number | null {
  if (!sorted.length) return null
  const below = countBelow(sorted, value)
  const eq = countAtMost(sorted, value) - below
  let r = ((below + eq / 2) / sorted.length) * 100
  if (better === 'lower') r = 100 - r
  return clamp(Math.round(r), 1, 99)
}

/** 비교 대상 values(값 없음 포함 가능) 안에서 value의 백분위. 값 없음은 분모에서도 뺀다 */
export function percentileOf(value: unknown, values: readonly unknown[], better: MetricDef['better']): number | null {
  if (isMissing(value) || better === null) return null
  return percentileInSorted(value as number, presentNumbers(values).sort((a, b) => a - b), better)
}

/** "상위 N%" 표시용. 백분위 99 → 상위 1% */
export const topPercent = (pctl: number) => Math.max(1, 100 - pctl)

// ---------- 리그 단위 ----------

export function metricValue(p: Player, key: MetricKey): Num {
  const v = (p.m as Record<string, unknown>)[key]
  return isMissing(v) ? null : (v as number)
}

const poolValues = (league: League, type: PlayerType, key: MetricKey) =>
  (league.pool[type] as Player[]).map((p) => metricValue(p, key))

/** 리그 평균: 비교 대상 선수 중 값이 있는 선수만의 평균 */
export function leagueAverage(league: League, type: PlayerType, key: MetricKey): number | null {
  return meanOfPresent(poolValues(league, type, key))
}

// 리그마다 지표별 정렬 배열을 한 번만 만든다
const sortedCache = new WeakMap<League, Map<string, number[]>>()

function sortedPool(league: League, type: PlayerType, key: MetricKey): number[] {
  let byKey = sortedCache.get(league)
  if (!byKey) sortedCache.set(league, (byKey = new Map()))
  const ck = `${type}:${key}`
  let sorted = byKey.get(ck)
  if (!sorted) byKey.set(ck, (sorted = presentNumbers(poolValues(league, type, key)).sort((a, b) => a - b)))
  return sorted
}

/** 리그 내 백분위. 좋고 나쁨이 없는 지표이거나 값이 없으면 null */
export function percentile(league: League, p: Player, key: MetricKey): number | null {
  const { better } = metricDef(key)
  const v = metricValue(p, key)
  if (v === null || better === null) return null
  return percentileInSorted(v, sortedPool(league, p.type, key), better)
}
