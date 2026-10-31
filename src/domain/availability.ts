import type { DataAvailability } from '../data/types'
import type { MetricKey } from './catalog'
import type { League } from './players'

// 지표마다 기대는 원시 기록. 여기 없는 지표는 기본 기록(타석·안타·이닝 등)만으로 계산하므로 언제나 있다.
const REQUIRES: Partial<Record<MetricKey, (a: DataAvailability) => boolean>> = {
  // 주루
  xbt: (a) => a.xbt,
  sprint: (a) => a.hitterTracking.sprint,
  h2f: (a) => a.hitterTracking.h2f,
  // 수비
  oaa: (a) => a.fielding.oaa,
  drs: (a) => a.fielding.drs,
  zr: (a) => a.fielding.zr,
  uzr: (a) => a.fielding.rngR && a.fielding.errR, // UZR = 구성 요소 합계
  rngR: (a) => a.fielding.rngR,
  errR: (a) => a.fielding.errR,
  dpR: (a) => a.fielding.dpR,
  armR: (a) => a.fielding.armR,
  frmR: (a) => a.fielding.frmR,
  blkR: (a) => a.fielding.blkR,
  csR: (a) => a.fielding.csR,
  csp: (a) => a.fielding.csp,
  fpct: (a) => a.fielding.TC && a.fielding.E,
  // 타자 트래킹
  ev: (a) => a.hitterTracking.ev,
  maxev: (a) => a.hitterTracking.maxev,
  hard: (a) => a.hitterTracking.hard,
  barrel: (a) => a.hitterTracking.barrel,
  xba: (a) => a.hitterTracking.xba,
  // 투수 트래킹
  velo: (a) => a.pitcherTracking.velo,
  spin: (a) => a.pitcherTracking.spin,
  whiff: (a) => a.pitcherTracking.whiff,
}

/** 이 리그의 데이터 출처가 그 지표를 계산할 기록을 주는지. false면 화면에서 그 지표 줄을 숨긴다 */
export function metricAvailable(league: League, key: MetricKey): boolean {
  const req = REQUIRES[key]
  return req ? req(league.meta.available) : true
}

export const availableKeys = (league: League, keys: readonly MetricKey[]) => keys.filter((k) => metricAvailable(league, k))
