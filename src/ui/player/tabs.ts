import { availableKeys } from '../../domain/availability'
import type { MetricKey } from '../../domain/catalog'
import { defenseTabAvailable } from '../../domain/defense'
import type { League, Player } from '../../domain/players'

export const HITTER_TRACKING: MetricKey[] = ['ev', 'maxev', 'hard', 'barrel', 'xba']
export const PITCHER_TRACKING: MetricKey[] = ['velo', 'spin', 'whiff']

export type Tab =
  | { label: string; kind: 'metrics'; keys: MetricKey[] }
  | { label: string; kind: 'defense' }
  | { label: string; kind: 'tracking' }
  | { label: string; kind: 'value' }

export const HITTER_TABS: Tab[] = [
  { label: '타격', kind: 'metrics', keys: ['WAR', 'wrcp', 'ops', 'woba', 'bbp', 'kp', 'babip'] },
  { label: '주루', kind: 'metrics', keys: ['bsr', 'sb', 'sbp', 'wsb', 'xbt', 'sprint', 'h2f'] },
  { label: '수비', kind: 'defense' },
  { label: '트래킹', kind: 'tracking' },
  { label: '선수 가치', kind: 'value' },
]
export const PITCHER_TABS: Tab[] = [
  { label: '투구', kind: 'metrics', keys: ['WAR', 'era', 'fip', 'whip', 'pk', 'pbb'] },
  { label: '트래킹', kind: 'tracking' },
  { label: '선수 가치', kind: 'value' },
]

/** 데이터 출처가 이 탭에 보여 줄 기록을 하나라도 주는지 */
export function tabAvailable(league: League, p: Player, tab: Tab): boolean {
  const a = league.meta.available
  if (tab.kind === 'metrics') return availableKeys(league, tab.keys).length > 0
  if (tab.kind === 'defense') return defenseTabAvailable(league)
  // WAR는 기본 기록만으로 계산하므로 언제나 연다 (클러치 기록이 없으면 그 부분만 숨긴다)
  if (tab.kind === 'value') return true
  return p.type === 'H'
    ? availableKeys(league, HITTER_TRACKING).length > 0 || a.battedBalls
    : availableKeys(league, PITCHER_TRACKING).length > 0 || a.pitcherTracking.mix
}
