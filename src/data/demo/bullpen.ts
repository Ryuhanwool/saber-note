// 가상 리그 불펜 투수의 세이브·홀드.
// 클러치 기록의 리드 지키기에서 만든다: 7회 이후(연장 포함) 리드를 지킨 등판 중 9회를 맡은 것이 세이브,
// 나머지 리드를 지킨 등판(1~6회 포함)이 홀드다. 그래서 세이브 + 홀드 = 리드를 지킨 등판 수.
// 다른 기록에 쓰는 난수와 섞이지 않게 따로 된 시드를 쓴다 → 기존 기록·리그 평균은 그대로다.
import type { InningCounts, RawPitcher, RawPitcherClutch } from '../types'
import { binomial } from './clutch'
import type { PitcherRates } from './generate'
import { clamp, gaussian, mulberry32, type Rand } from './random'

/** 세이브·홀드 전용 시드 */
export const BULLPEN_SEED_OFFSET = 0xb011

const sum = (c: InningCounts) => c.early + c.late + c.extra

/** 7회 이후 리드를 지킨 등판 (세이브가 될 수 있는 등판) */
export const lateHolds = (c: RawPitcherClutch) => c.leadHeld1.late + c.leadHeld1.extra + c.leadHeldMulti.late + c.leadHeldMulti.extra
/** 리드를 지킨 모든 등판 */
export const allHolds = (c: RawPitcherClutch) => sum(c.leadHeld1) + sum(c.leadHeldMulti)

/** 7회 이후 리드를 지킨 등판 중 9회를 맡을 확률: 헛스윙·삼진이 많을수록 높고, 운(감독의 선택)도 섞인다 */
const ninthShare = (rates: PitcherRates, rn: () => number) => clamp(0.45 + 2.5 * (rates.k - 0.25) + 0.15 * rn(), 0.1, 0.9)

/** 기준 시즌: 불펜 투수마다 세이브·홀드를 만든다 (선발은 null) */
export function addDemoSaves(seed: number, pitchers: RawPitcher[], pitcherRates: ReadonlyMap<string, PitcherRates>): void {
  const R = mulberry32(seed + BULLPEN_SEED_OFFSET)
  const rn = () => gaussian(R)
  for (const p of pitchers) {
    if (p.role !== 'RP' || !p.clutch) continue
    const share = ninthShare(pitcherRates.get(p.id)!, rn)
    p.SV = binomial(lateHolds(p.clutch), share, R)
    p.HLD = allHolds(p.clutch) - p.SV
  }
}

/** 하루 경기의 세이브·홀드: 그날 7회 이후 지킨 리드마다 그 투수의 기준 시즌 세이브 비율로 정한다 */
export function daySaves(base: RawPitcher, day: RawPitcherClutch, R: Rand): { SV: number; HLD: number } {
  const late = lateHolds(day)
  const baseLate = base.clutch ? lateHolds(base.clutch) : 0
  const rate = baseLate > 0 ? (base.SV ?? 0) / baseLate : 0
  const SV = binomial(late, rate, R)
  return { SV, HLD: allHolds(day) - SV }
}
