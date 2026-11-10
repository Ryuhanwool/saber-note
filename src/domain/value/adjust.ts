// 스탯 조절: 기록을 바꿔 보면 기존 공식으로 OPS·wRC+·FIP·WAR를 다시 계산하고 예상 가치에 반영한다.
// 기록은 WAR로만 가치에 들어간다(같은 활약을 두 번 세지 않는다). 리그 기준값(리그 wOBA·FIP 상수·리그 ERA)은 그대로 둔다.
import type { RawHitter, RawPitcher } from '../../data/types'
import { hitterMetrics, pitcherMetrics } from '../league'
import type { League, Player } from '../players'
import { clutchScore } from './clutch'
import { expectedValue, tenths, type ValueBreakdown } from './value'

export type HitterAdjustKey = 'HR' | 'H' | 'BB' | 'SO' | 'SB'
export type PitcherAdjustKey = 'outs' | 'SO' | 'BB' | 'HR' | 'ER'
export type HitterStats = Record<HitterAdjustKey, number>
export type PitcherStats = Record<PitcherAdjustKey, number>
export type Range = { min: number; max: number }

export const HITTER_ADJUST_KEYS: readonly HitterAdjustKey[] = ['HR', 'H', 'BB', 'SO', 'SB']
export const PITCHER_ADJUST_KEYS: readonly PitcherAdjustKey[] = ['outs', 'SO', 'BB', 'HR', 'ER']

/** 클러치 점수(승) 조절 범위 */
export const CLUTCH_ADJUST_RANGE: Range = { min: -3, max: 3 }

/** 원래 값보다 크게 늘릴 수 있는 상한 (타석 같은 다른 제약이 없는 기록) */
const cap = (orig: number) => Math.max(orig * 2, orig + 20)
const clampTo = (x: number, r: Range) => Math.min(r.max, Math.max(r.min, Math.round(x)))

// ---------- 타자 ----------

export const hitterStatsOf = (h: RawHitter): HitterStats => ({ HR: h.HR, H: h.S1 + h.D2 + h.D3 + h.HR, BB: h.BB, SO: h.SO, SB: h.SB })

/**
 * 바꾼 기록을 원시 기록에 반영한다. 타석·몸에 맞는 공·도루 실패는 그대로이고, 안타·볼넷·삼진이 늘면 범타 아웃이 줄어든다.
 * 홈런이 아닌 안타는 2루타·3루타를 그대로 두고 단타로 맞춘다(모자라면 2루타, 3루타 순으로 줄인다).
 */
export function applyHitter(h: RawHitter, s: HitterStats): RawHitter {
  const nonHR = s.H - s.HR
  const D3 = Math.min(h.D3, nonHR)
  const D2 = Math.min(h.D2, nonHR - D3)
  return { ...h, HR: s.HR, S1: nonHR - D2 - D3, D2, D3, BB: s.BB, SO: s.SO, SB: s.SB }
}

/** 지금 다른 기록을 기준으로 각 기록이 가질 수 있는 범위 */
export function hitterLimits(h: RawHitter, s: HitterStats): Record<HitterAdjustKey, Range> {
  const room = h.PA - h.HBP // 타석에서 몸에 맞는 공을 뺀 나머지
  const S1 = applyHitter(h, s).S1
  return {
    H: { min: s.HR, max: room - s.BB - s.SO }, // 홈런보다 적을 수 없다
    HR: { min: 0, max: s.H }, // 안타보다 많을 수 없다
    BB: { min: 0, max: room - s.H - s.SO },
    SO: { min: 0, max: room - s.H - s.BB },
    SB: { min: 0, max: Math.max(0, S1 + s.BB + h.HBP - h.CS) }, // 1루에 나간 횟수 − 도루 실패
  }
}

// ---------- 투수 ----------

export const pitcherStatsOf = (p: RawPitcher): PitcherStats => ({ outs: p.outs, SO: p.SO, BB: p.BB, HR: p.HR, ER: p.ER })

/** 바꾼 기록을 원시 기록에 반영한다. 상대 타자 수는 늘어난 아웃·볼넷·홈런만큼, 피안타는 홈런만큼 바뀐다 */
export function applyPitcher(p: RawPitcher, s: PitcherStats): RawPitcher {
  const dHR = s.HR - p.HR
  return { ...p, outs: s.outs, SO: s.SO, BB: s.BB, HR: s.HR, ER: s.ER, H: p.H + dHR, TBF: p.TBF + (s.outs - p.outs) + (s.BB - p.BB) + dHR }
}

export function pitcherLimits(p: RawPitcher, s: PitcherStats): Record<PitcherAdjustKey, Range> {
  return {
    outs: { min: 1, max: cap(p.outs) }, // 이닝은 0이 될 수 없다 (⅓이닝 이상)
    SO: { min: 0, max: s.outs }, // 삼진은 아웃이라 잡은 아웃 수를 넘을 수 없다
    BB: { min: 0, max: cap(p.BB) },
    HR: { min: 0, max: cap(p.HR) }, // 피안타는 홈런만큼 함께 바뀐다
    ER: { min: 0, max: cap(p.ER) },
  }
}

// ---------- 공통 ----------

export const statsOf = (p: Player): HitterStats | PitcherStats => (p.type === 'H' ? hitterStatsOf(p.raw) : pitcherStatsOf(p.raw))

export function limitsOf(p: Player, s: HitterStats | PitcherStats): Record<string, Range> {
  return p.type === 'H' ? hitterLimits(p.raw, s as HitterStats) : pitcherLimits(p.raw, s as PitcherStats)
}

/**
 * 기록 하나를 바꾼다. 말이 안 되는 값은 허용 범위로 맞추고,
 * 그 때문에 범위를 벗어난 다른 기록(예: 안타를 줄여 1루 출루가 줄면 도루, 이닝을 줄이면 삼진)도 함께 맞춘다.
 */
export function setStat<S extends HitterStats | PitcherStats>(p: Player, s: S, key: keyof S & string, value: number): S {
  const next = { ...s, [key]: clampTo(value, limitsOf(p, s)[key]) }
  const lim = limitsOf(p, next)
  for (const k of Object.keys(next) as (keyof S & string)[]) {
    if (k !== key) (next as Record<string, number>)[k] = clampTo(next[k] as number, lim[k])
  }
  return next
}

/** 바꾼 기록으로 지표를 다시 계산한 선수 (리그 기준값은 그대로) */
export function adjustedPlayer(league: League, p: Player, s: HitterStats | PitcherStats): Player {
  const { totals, constants: c } = league
  if (p.type === 'H') {
    const raw = applyHitter(p.raw, s as HitterStats)
    return { ...p, raw, m: hitterMetrics(raw, totals, c) }
  }
  const raw = applyPitcher(p.raw, s as PitcherStats)
  return { ...p, raw, m: pitcherMetrics(raw, totals, c) }
}

/** 조절을 시작할 때의 클러치 점수(승, 0.1 단위). 클러치 기록이 없으면 null */
export function initialClutch(league: League, p: Player): number | null {
  const c = clutchScore(league, p)
  return c === null ? null : tenths(c.wins) / 10 || 0
}

export const clampClutch = (x: number) => Math.min(CLUTCH_ADJUST_RANGE.max, Math.max(CLUTCH_ADJUST_RANGE.min, tenths(x) / 10)) || 0

/** 바꾼 기록과 클러치 점수로 다시 계산한 선수와 예상 가치 */
export function adjustedValue(league: League, p: Player, s: HitterStats | PitcherStats, clutchWins: number | null): { player: Player; value: ValueBreakdown } {
  const player = adjustedPlayer(league, p, s)
  return { player, value: expectedValue(player.m.WAR, clutchWins === null ? null : clampClutch(clutchWins)) }
}

/** 원래 기록과 같은지 */
export const isOriginal = (p: Player, s: HitterStats | PitcherStats) =>
  Object.entries(statsOf(p)).every(([k, v]) => (s as Record<string, number>)[k] === v)
