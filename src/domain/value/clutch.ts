// 클러치 점수: 결정적인 순간의 활약을 점수표(scoring.ts)로 센 뒤,
// 같은 기회를 받은 리그 평균 선수의 기대 점수를 빼고 「승리」 단위로 바꾼다.
import type { InningCounts, RawHitterClutch, RawPitcherClutch } from '../../data/types'
import type { League, Player } from '../players'
import { CLUTCH_POINTS_PER_WIN, HITTER_POINTS, INNING_MULTIPLIER, PITCHER_POINTS } from './scoring'

type Phase = keyof InningCounts
const PHASES: Phase[] = ['early', 'late', 'extra']

/** 기회 종류: 기대 점수는 종류·이닝 구간마다 따로 구한다 */
export type ChanceKind = 'bat' | 'steal' | 'defense' | 'crisis' | 'lead1' | 'leadMulti'

/** 점수가 된 기록 한 종류 */
export type ClutchItem = {
  key: keyof typeof HITTER_POINTS | keyof typeof PITCHER_POINTS
  label: string
  chance: ChanceKind
  /** 한 번에 받는 점수 (배수 전) */
  each: number
  /** 점수가 된 횟수 (타자는 이긴 경기만) */
  counts: InningCounts
}

export type ClutchEvidence = {
  key: ClutchItem['key']
  label: string
  /** 점수가 된 횟수 */
  count: number
  /** 그중 7회 이후(연장 포함) */
  late: number
  /** 받은 점수 (배수 포함) */
  points: number
}

export type ClutchResult = {
  /** 이 선수가 받은 점수 */
  points: number
  /** 같은 기회를 받은 리그 평균 선수의 기대 점수 */
  expected: number
  /** 클러치 점수 = points − expected */
  score: number
  /** 승리 단위로 바꾼 클러치 점수 */
  wins: number
  games: number
  /** 경기당 클러치 점수 */
  perGame: number
  /** 점수가 된 기록 (점수표 순서) */
  evidence: ClutchEvidence[]
  /** 팀이 진 경기라 점수에 넣지 않은 역전타·동점타 수 (투수는 0) */
  lostGoAheadOrTying: number
}

const total = (c: InningCounts) => c.early + c.late + c.extra

function hitterItems(c: RawHitterClutch): ClutchItem[] {
  const P = HITTER_POINTS
  // 팀이 이긴 경기만 점수가 된다
  return [
    { key: 'goAhead', label: '역전타', chance: 'bat', each: P.goAhead, counts: c.goAhead.won },
    { key: 'tying', label: '동점타', chance: 'bat', each: P.tying, counts: c.tying.won },
    { key: 'chase1', label: '1점 차 추격타', chance: 'bat', each: P.chase1, counts: c.chase1.won },
    { key: 'chase2', label: '2점 차 추격타', chance: 'bat', each: P.chase2, counts: c.chase2.won },
    { key: 'chase3', label: '3점 차 이상 추격타', chance: 'bat', each: P.chase3, counts: c.chase3.won },
    { key: 'steal', label: '접전 도루', chance: 'steal', each: P.steal, counts: c.steals.won },
    { key: 'stealRun', label: '도루 뒤 득점', chance: 'steal', each: P.stealRun, counts: c.stealRuns.won },
    { key: 'defensePlay', label: '실점 막은 호수비·보살', chance: 'defense', each: P.defensePlay, counts: c.defensePlays.won },
  ]
}

function pitcherItems(c: RawPitcherClutch): ClutchItem[] {
  const P = PITCHER_POINTS
  return [
    { key: 'escape', label: '위기 무실점 탈출', chance: 'crisis', each: P.escape, counts: c.escapes },
    { key: 'escapeLastK', label: '삼진으로 끝낸 위기', chance: 'crisis', each: P.escapeLastK, counts: c.escapesLastK },
    { key: 'escapeNoBB', label: '볼넷 없이 막은 위기', chance: 'crisis', each: P.escapeNoBB, counts: c.escapesNoBB },
    { key: 'leadHeld1', label: '1점 차 리드 지킴', chance: 'lead1', each: P.leadHeld1, counts: c.leadHeld1 },
    { key: 'leadHeld', label: '2점 차 이상 리드 지킴', chance: 'leadMulti', each: P.leadHeld, counts: c.leadHeldMulti },
  ]
}

type Chances = Partial<Record<ChanceKind, InningCounts>>

const hitterChances = (c: RawHitterClutch): Chances => ({ bat: c.battingChances, steal: c.stealChances, defense: c.defenseChances })
const pitcherChances = (c: RawPitcherClutch): Chances => ({ crisis: c.crisis, lead1: c.leadApps1, leadMulti: c.leadAppsMulti })

type Parsed = { items: ClutchItem[]; chances: Chances; games: number; lostGoAheadOrTying: number }

function parse(p: Player): Parsed | null {
  if (p.type === 'H') {
    const c = p.raw.clutch
    return c && { items: hitterItems(c), chances: hitterChances(c), games: c.games, lostGoAheadOrTying: total(c.goAhead.lost) + total(c.tying.lost) }
  }
  const c = p.raw.clutch
  return c && { items: pitcherItems(c), chances: pitcherChances(c), games: c.games, lostGoAheadOrTying: 0 }
}

const itemPoints = (it: ClutchItem, ph: Phase) => it.counts[ph] * it.each * INNING_MULTIPLIER[ph]

/** 기회 종류·이닝 구간별 받은 점수 */
function pointsByChance(items: ClutchItem[]): Chances {
  const out: Chances = {}
  for (const it of items) {
    const acc = (out[it.chance] ??= { early: 0, late: 0, extra: 0 })
    for (const ph of PHASES) acc[ph] += itemPoints(it, ph)
  }
  return out
}

/** 리그 평균: 기회 종류·이닝 구간마다 (리그 전체 점수 ÷ 리그 전체 기회) */
export type ClutchLeagueRates = Partial<Record<ChanceKind, InningCounts>>

const ratesCache = new WeakMap<League, ClutchLeagueRates>()

export function clutchLeagueRates(league: League): ClutchLeagueRates {
  const hit = ratesCache.get(league)
  if (hit) return hit
  const pts: Chances = {}, chs: Chances = {}
  for (const p of [...league.hitters, ...league.pitchers]) {
    const parsed = parse(p)
    if (!parsed) continue
    const byChance = pointsByChance(parsed.items)
    for (const kind of Object.keys(parsed.chances) as ChanceKind[]) {
      const a = (pts[kind] ??= { early: 0, late: 0, extra: 0 }), b = (chs[kind] ??= { early: 0, late: 0, extra: 0 })
      for (const ph of PHASES) {
        a[ph] += byChance[kind]?.[ph] ?? 0
        b[ph] += parsed.chances[kind]![ph]
      }
    }
  }
  const rates: ClutchLeagueRates = {}
  for (const kind of Object.keys(chs) as ChanceKind[]) {
    rates[kind] = Object.fromEntries(PHASES.map((ph) => [ph, chs[kind]![ph] > 0 ? pts[kind]![ph] / chs[kind]![ph] : 0])) as InningCounts
  }
  ratesCache.set(league, rates)
  return rates
}

/** 이 리그가 클러치 기록을 주는지 (없으면 화면에서 클러치 부분을 숨긴다) */
export const clutchAvailable = (league: League) => league.meta.available.clutch

/** 선수의 클러치 점수. 출처에 클러치 기록이 없으면 null */
export function clutchScore(league: League, p: Player): ClutchResult | null {
  if (!clutchAvailable(league)) return null
  const parsed = parse(p)
  if (!parsed) return null
  const rates = clutchLeagueRates(league)
  let points = 0
  const evidence: ClutchEvidence[] = parsed.items.map((it) => {
    const pts = PHASES.reduce((a, ph) => a + itemPoints(it, ph), 0)
    points += pts
    return { key: it.key, label: it.label, count: total(it.counts), late: it.counts.late + it.counts.extra, points: pts }
  })
  let expected = 0
  for (const kind of Object.keys(parsed.chances) as ChanceKind[]) {
    for (const ph of PHASES) expected += parsed.chances[kind]![ph] * (rates[kind]?.[ph] ?? 0)
  }
  const score = points - expected
  return {
    points, expected, score,
    wins: score / CLUTCH_POINTS_PER_WIN,
    games: parsed.games,
    perGame: parsed.games > 0 ? score / parsed.games : 0,
    evidence,
    lostGoAheadOrTying: parsed.lostGoAheadOrTying,
  }
}
