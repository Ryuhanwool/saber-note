// 게임 1. 지표 업다운: 오른쪽 선수의 지표가 왼쪽 선수보다 높을지 낮을지 맞힌다. 맞히면 오른쪽 선수가 다음 기준이 된다.
import type { MetricKey } from '../catalog'
import { metricValue } from '../percentile'
import type { HitterPlayer } from '../players'
import { pick, type Rand } from '../random'

export const UPDOWN_KEYS: MetricKey[] = ['wrcp', 'ops', 'WAR', 'hr', 'sb']

export type UpDown = {
  a: HitterPlayer
  b: HitterPlayer
  key: MetricKey
  streak: number
  result: 'ok' | 'no' | null
  over: boolean
}

function other(pool: readonly HitterPlayer[], not: HitterPlayer, rand: Rand): HitterPlayer {
  let b: HitterPlayer
  do b = pick(pool, rand)
  while (b === not)
  return b
}

/** pool: 문제에 낼 타자(비교 대상 타자), keys: 출처에 있는 지표만 */
export function startUpDown(pool: readonly HitterPlayer[], keys: readonly MetricKey[], rand: Rand): UpDown | null {
  if (pool.length < 2 || !keys.length) return null
  const a = pick(pool, rand)
  return { a, b: other(pool, a, rand), key: pick(keys, rand), streak: 0, result: null, over: false }
}

/** 같은 값이면 "높다"와 "낮다" 모두 정답 (데모 규칙). 한쪽 값이 없으면 정답으로 친다 */
export function answerUpDown(s: UpDown, guess: 'higher' | 'lower'): UpDown {
  if (s.result) return s
  const a = metricValue(s.a, s.key)
  const b = metricValue(s.b, s.key)
  const ok = a === null || b === null || (guess === 'higher' ? b >= a : b <= a)
  return ok ? { ...s, result: 'ok', streak: s.streak + 1 } : { ...s, result: 'no', over: true }
}

/** 맞힌 뒤 다음 문제: 오른쪽 선수가 왼쪽(기준)으로 */
export function nextUpDown(s: UpDown, pool: readonly HitterPlayer[], keys: readonly MetricKey[], rand: Rand): UpDown {
  if (s.result !== 'ok') return s
  return { ...s, a: s.b, b: other(pool, s.b, rand), key: pick(keys, rand), result: null }
}
