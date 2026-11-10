import type { DataAvailability, RawDataset, RawFielding, RawHitterTracking, RawPitcherTracking } from './types'

const FIELDING_KEYS: (keyof RawFielding)[] = [
  'inn', 'TC', 'E', 'DP', 'A_OF', 'rngR', 'errR', 'dpR', 'armR', 'frmR', 'blkR', 'csR', 'csp', 'drs', 'oaa', 'zr', 'ratings',
]
const HITTER_TRACKING_KEYS: (keyof RawHitterTracking)[] = ['ev', 'maxev', 'la', 'hard', 'barrel', 'xba', 'sprint', 'h2f']
const PITCHER_TRACKING_KEYS: (keyof RawPitcherTracking)[] = ['velo', 'spin', 'whiff', 'mix']

const fill = <K extends string>(keys: K[], on: (k: K) => boolean) =>
  Object.fromEntries(keys.map((k) => [k, on(k)])) as Record<K, boolean>

/** 출처가 제공하는 필드만 true로 표시한 목록을 만든다. 나열하지 않은 필드는 모두 없음(false) */
export function availability(provided: {
  xbt?: boolean
  fielding?: (keyof RawFielding)[]
  hitterTracking?: (keyof RawHitterTracking)[]
  pitcherTracking?: (keyof RawPitcherTracking)[]
  battedBalls?: boolean
  clutch?: boolean
}): DataAvailability {
  return {
    xbt: provided.xbt ?? false,
    fielding: fill(FIELDING_KEYS, (k) => provided.fielding?.includes(k) ?? false),
    hitterTracking: fill(HITTER_TRACKING_KEYS, (k) => provided.hitterTracking?.includes(k) ?? false),
    pitcherTracking: fill(PITCHER_TRACKING_KEYS, (k) => provided.pitcherTracking?.includes(k) ?? false),
    battedBalls: provided.battedBalls ?? false,
    clutch: provided.clutch ?? false,
  }
}

/** 모든 기록이 있는 출처 */
export const ALL_AVAILABLE: DataAvailability = availability({
  xbt: true,
  fielding: FIELDING_KEYS,
  hitterTracking: HITTER_TRACKING_KEYS,
  pitcherTracking: PITCHER_TRACKING_KEYS,
  battedBalls: true,
  clutch: true,
})

/**
 * "없음"이라고 알린 필드에 값이 들어 있는 곳을 찾는다 (출처 구현 검사용).
 * 없다고 한 기록은 모든 선수에게 null이어야 한다.
 */
export function unavailableButPresent(ds: RawDataset): string[] {
  const a = ds.meta.available
  const out: string[] = []
  for (const h of ds.hitters) {
    if (!a.xbt && h.xbt !== null) out.push(`${h.id} xbt`)
    for (const k of FIELDING_KEYS) if (!a.fielding[k] && h.fielding[k] !== null) out.push(`${h.id} fielding.${k}`)
    for (const k of HITTER_TRACKING_KEYS) if (!a.hitterTracking[k] && h.tracking[k] !== null) out.push(`${h.id} tracking.${k}`)
    if (!a.clutch && h.clutch !== null) out.push(`${h.id} clutch`)
  }
  for (const p of ds.pitchers) {
    for (const k of PITCHER_TRACKING_KEYS) if (!a.pitcherTracking[k] && p.tracking[k] !== null) out.push(`${p.id} tracking.${k}`)
    if (!a.clutch && p.clutch !== null) out.push(`${p.id} clutch`)
  }
  return out
}
