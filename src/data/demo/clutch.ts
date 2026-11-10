// 가상 리그의 경기 상황별(클러치) 기록.
// 실력(타격·주루·수비·투구 확률)과 관련은 있지만 운의 영향이 크게: 기회 수와 성공 횟수를 모두 난수로 뽑는다(이항 분포).
// 기존 선수 기록·골든 값이 바뀌지 않도록 생성기와 다른 시드의 난수를 쓴다.
import type { InningCounts, PlayerId, RawHitter, RawHitterClutch, RawPitcher, RawPitcherClutch, WinLossCounts } from '../types'
import type { HitterRates, PitcherRates } from './generate'
import { clamp, gaussian, mulberry32, type Rand } from './random'

/** 클러치 기록 전용 시드 (생성기 시드와 섞이지 않게) */
export const CLUTCH_SEED_OFFSET = 0x5c1

type Phase = keyof InningCounts
const PHASES: Phase[] = ['early', 'late', 'extra']

const zero = (): InningCounts => ({ early: 0, late: 0, extra: 0 })
const zeroWL = (): WinLossCounts => ({ won: zero(), lost: zero() })

/** n번 시도해서 확률 p로 성공한 횟수 */
export function binomial(n: number, p: number, R: Rand): number {
  let k = 0
  for (let i = 0; i < n; i++) if (R() < p) k++
  return k
}

/** 평균 mean 근처의 기회 수 (기회 자체도 운: ±15% 정도 흔들림) */
const chances = (mean: number, rn: () => number) => Math.max(0, Math.round(mean * (1 + 0.15 * rn())))

/** 이닝 구간마다 기회 → 성공 → 이긴 경기/진 경기로 나눠 센다 */
function successes(ch: InningCounts, p: (ph: Phase) => number, winP: (ph: Phase) => number, R: Rand): WinLossCounts {
  const out = zeroWL()
  for (const ph of PHASES) {
    const n = binomial(ch[ph], p(ph), R)
    const won = binomial(n, winP(ph), R)
    out.won[ph] = won
    out.lost[ph] = n - won
  }
  return out
}

const split = (total: number, shares: InningCounts, rn: () => number): InningCounts => ({
  early: chances(total * shares.early, rn),
  late: chances(total * shares.late, rn),
  extra: chances(total * shares.extra, rn),
})

/** 리그 평균 수준 타자의 안타 확률 (타석당) */
const AVG_HIT_RATE = 0.236

/** 승패를 나누는 클러치 기록 종류 */
export type HitterClutchHit = 'goAhead' | 'tying' | 'chase1' | 'chase2' | 'chase3'
export const HITTER_CLUTCH_HITS: readonly HitterClutchHit[] = ['goAhead', 'tying', 'chase1', 'chase2', 'chase3']

/**
 * 타자 클러치 확률 (선수의 실력). 시즌 기록 생성과 하루 경기 시뮬레이션(season.ts)이 함께 쓴다.
 * 기회 비율은 타석(타격)·1·2루 출루(도루)·수비 이닝/9(수비) 하나당 이닝 구간별 기대 횟수다.
 */
export function hitterClutchParams(h: RawHitter, rates: HitterRates) {
  // 타격 실력: 타석당 안타 확률이 평균의 몇 배인지
  const hitRate = (1 - rates.bb - rates.k - rates.hr - rates.hbp) * rates.babip + rates.hr
  const q = clamp(hitRate / AVG_HIT_RATE, 0.6, 1.5)
  const late = (ph: Phase) => (ph === 'early' ? 0 : 0.1)
  const onBase = h.S1 + h.D2 + h.BB + h.HBP
  const att = h.SB + h.CS
  const tryRate = onBase > 0 ? att / onBase : 0
  const succRate = att > 0 ? h.SB / att : 0.7
  const runP = clamp(0.38 + 0.08 * ((h.tracking.sprint ?? 8.2) - 8.2) / 0.3, 0.2, 0.6)
  const f = h.fielding
  const range = (f.rngR ?? 0) + (f.armR ?? 0) + (f.csR ?? 0)
  return {
    /** 동점이거나 지고 있는 타석: 1~6회 36%, 7~9회 18%, 연장 1.6% */
    batShare: { early: 0.36, late: 0.18, extra: 0.016 } as InningCounts,
    /** 타격 기회 하나가 그 안타가 될 확률 */
    hitP: { goAhead: 0.018 * q, tying: 0.016 * q, chase1: 0.012 * q, chase2: 0.01 * q, chase3: 0.014 * q } as Record<HitterClutchHit, number>,
    /** 그 안타가 나온 경기를 팀이 이길 확률 */
    winP: (k: HitterClutchHit, ph: Phase) =>
      k === 'goAhead' ? 0.66 + late(ph) : k === 'tying' ? 0.5 + late(ph) / 2 : k === 'chase1' ? 0.34 : k === 'chase2' ? 0.24 : 0.1,
    /** 접전 도루 기회: 1·2루 출루 하나당 */
    stealShare: { early: 0.32, late: 0.15, extra: 0.012 } as InningCounts,
    stealP: clamp(tryRate * succRate, 0, 0.5),
    stealWinP: 0.55,
    /** 도루한 주자가 득점할 확률 (이긴 경기 +0.08, 진 경기 −0.08) */
    runP,
    /** 수비 기회: 수비 9이닝당 0.32번 */
    defensePer9: f.inn === null ? 0 : 0.32,
    defenseShare: { early: 0.66, late: 0.32, extra: 0.02 } as InningCounts,
    defenseP: 0.07 * clamp(1 + 0.06 * range, 0.6, 1.5),
    defenseWinP: 0.56,
  }
}

function hitterClutch(h: RawHitter, rates: HitterRates, R: Rand, rn: () => number): RawHitterClutch {
  const m = hitterClutchParams(h, rates)
  // 시즌은 144경기 (경기당 4.3타석 정도)
  const games = Math.min(144, Math.round(h.PA / 4.3))
  const battingChances = split(h.PA, m.batShare, rn)
  const goAhead = successes(battingChances, () => m.hitP.goAhead, (ph) => m.winP('goAhead', ph), R)
  const tying = successes(battingChances, () => m.hitP.tying, (ph) => m.winP('tying', ph), R)
  const chase1 = successes(battingChances, () => m.hitP.chase1, (ph) => m.winP('chase1', ph), R)
  const chase2 = successes(battingChances, () => m.hitP.chase2, (ph) => m.winP('chase2', ph), R)
  const chase3 = successes(battingChances, () => m.hitP.chase3, (ph) => m.winP('chase3', ph), R)

  // 도루: 접전에서 1·2루 주자로 나간 횟수 × 시도율 × 성공률
  const onBase = h.S1 + h.D2 + h.BB + h.HBP
  const stealChances = split(onBase, m.stealShare, rn)
  const steals = successes(stealChances, () => m.stealP, () => m.stealWinP, R)
  // 그 주자가 득점: 발이 빠를수록 조금 더 (스프린트 스피드 기준), 이긴 경기에서 더 자주
  const stealRuns: WinLossCounts = {
    won: Object.fromEntries(PHASES.map((ph) => [ph, binomial(steals.won[ph], m.runP + 0.08, R)])) as InningCounts,
    lost: Object.fromEntries(PHASES.map((ph) => [ph, binomial(steals.lost[ph], m.runP - 0.08, R)])) as InningCounts,
  }

  // 수비: 접전·득점권 주자 상황에서 자기에게 온 타구 중 실점을 막은 호수비·보살
  const f = h.fielding
  const defenseChances = f.inn === null ? zero() : split((f.inn / 9) * m.defensePer9, m.defenseShare, rn)
  const defensePlays = successes(defenseChances, () => m.defenseP, () => m.defenseWinP, R)

  return { games, battingChances, goAhead, tying, chase1, chase2, chase3, stealChances, steals, stealRuns, defenseChances, defensePlays }
}

/** 투수 클러치 확률 (선수의 실력). 기회 비율은 등판 하나당 이닝 구간별 기대 횟수다 */
export function pitcherClutchParams(p: RawPitcher, rates: PitcherRates) {
  const sp = p.role === 'SP'
  // 투구 실력: 삼진이 많고 볼넷이 적을수록 위기를 잘 넘긴다
  const skill = 0.9 * (rates.k - 0.22) - 1.4 * (rates.bb - 0.08)
  return {
    crisisShare: (sp ? { early: 1.1, late: 0.12, extra: 0 } : { early: 0.08, late: 0.42, extra: 0.04 }) as InningCounts,
    escapeP: clamp(0.55 + skill, 0.35, 0.8),
    lastKP: clamp(0.25 + rates.k - 0.22, 0.1, 0.5),
    noBBP: clamp(0.85 - 2 * (rates.bb - 0.08), 0.6, 0.95),
    /** 리드 상황 등판: 선발은 주로 1~6회, 불펜은 7회 이후. 3분의 1 정도가 1점 차 */
    leadShare: (sp ? { early: 0.45, late: 0.03, extra: 0 } : { early: 0.02, late: 0.3, extra: 0.02 }) as InningCounts,
    oneRunP: 0.35,
    hold1P: clamp(0.68 + skill, 0.45, 0.9),
    holdMultiP: clamp(0.88 + skill / 2, 0.7, 0.97),
  }
}

function pitcherClutch(p: RawPitcher, rates: PitcherRates, R: Rand, rn: () => number): RawPitcherClutch {
  const m = pitcherClutchParams(p, rates)
  const ip = p.outs / 3
  const games = Math.max(1, Math.round(p.role === 'SP' ? ip / 5.7 : ip / 1.05))
  const crisis = split(games, m.crisisShare, rn)
  const escapes = zero(), escapesLastK = zero(), escapesNoBB = zero()
  for (const ph of PHASES) {
    escapes[ph] = binomial(crisis[ph], m.escapeP, R)
    escapesLastK[ph] = binomial(escapes[ph], m.lastKP, R)
    escapesNoBB[ph] = binomial(escapes[ph], m.noBBP, R)
  }
  const leadApps = split(games, m.leadShare, rn)
  const leadApps1 = zero(), leadAppsMulti = zero(), leadHeld1 = zero(), leadHeldMulti = zero()
  for (const ph of PHASES) {
    leadApps1[ph] = binomial(leadApps[ph], m.oneRunP, R)
    leadAppsMulti[ph] = leadApps[ph] - leadApps1[ph]
    leadHeld1[ph] = binomial(leadApps1[ph], m.hold1P, R)
    leadHeldMulti[ph] = binomial(leadAppsMulti[ph], m.holdMultiP, R)
  }
  return { games, crisis, escapes, escapesLastK, escapesNoBB, leadApps1, leadHeld1, leadAppsMulti, leadHeldMulti }
}

/** 모든 선수의 클러치 기록을 만들어 각 선수의 clutch에 넣는다 */
export function addDemoClutch(
  seed: number,
  hitters: RawHitter[],
  pitchers: RawPitcher[],
  hitterRates: ReadonlyMap<PlayerId, HitterRates>,
  pitcherRates: ReadonlyMap<PlayerId, PitcherRates>,
): void {
  const R = mulberry32(seed + CLUTCH_SEED_OFFSET)
  const rn = () => gaussian(R)
  for (const h of hitters) h.clutch = hitterClutch(h, hitterRates.get(h.id)!, R, rn)
  for (const p of pitchers) p.clutch = pitcherClutch(p, pitcherRates.get(p.id)!, R, rn)
}
