// 게임 3. 세이버 픽 챌린지 (주간): 지표 맞대결 5문제(타자 wRC+ 3, 선발 FIP 2)를 예측하고 그 주 기록으로 채점한다.
// 규칙(PRD): 1문제당 10점, 5문제 모두 맞히면 보너스 10점.
//           타자 주간 10타석 미만, 투수 주간 등판 없음이면 그 문제는 전원 정답 처리.
import type { PlayerId, RawWeek, RawWeeklyHitting, RawWeeklyPitching } from '../../data/types'
import { wobaNumerator } from '../metrics/batting'
import type { HitterPlayer, League, PitcherPlayer } from '../players'
import { shuffle, type Rand } from '../random'

export const POINTS_PER_QUESTION = 10
export const PERFECT_BONUS = 10
export const MIN_WEEKLY_PA = 10

export type ChallengeQuestion =
  | { kind: 'H'; a: HitterPlayer; b: HitterPlayer }
  | { kind: 'P'; a: PitcherPlayer; b: PitcherPlayer }

export type Side = 'a' | 'b'

/** 타자 3문제 + 선발 투수 2문제. 선수가 모자라면 null */
export function startChallenge(hitters: readonly HitterPlayer[], starters: readonly PitcherPlayer[], rand: Rand): ChallengeQuestion[] | null {
  if (hitters.length < 6 || starters.length < 4) return null
  const hs = shuffle(hitters, rand)
  const sp = shuffle(starters, rand)
  return [
    ...[0, 1, 2].map((i): ChallengeQuestion => ({ kind: 'H', a: hs[i * 2], b: hs[i * 2 + 1] })),
    ...[0, 1].map((i): ChallengeQuestion => ({ kind: 'P', a: sp[i * 2], b: sp[i * 2 + 1] })),
  ]
}

export const challengePlayerIds = (qs: readonly ChallengeQuestion[]): PlayerId[] => qs.flatMap((q) => [q.a.id, q.b.id])

/** 주간 성적 한 줄: 타자는 주간 wRC+, 투수는 주간 FIP */
export type WeeklyLine =
  | { kind: 'H'; PA: number; value: number | null; valid: boolean }
  | { kind: 'P'; GS: number; outs: number; value: number | null; valid: boolean }

export function hitterWeekly(w: RawWeeklyHitting | undefined, league: League): WeeklyLine {
  const PA = w?.PA ?? 0
  if (!w || PA === 0) return { kind: 'H', PA: 0, value: null, valid: false }
  const c = league.constants
  const woba = wobaNumerator(w, c.woba) / PA
  const value = (((woba - league.totals.woba) / c.wobaScale + c.runsPerPA) / c.runsPerPA) * 100
  return { kind: 'H', PA, value, valid: PA >= MIN_WEEKLY_PA }
}

export function pitcherWeekly(w: RawWeeklyPitching | undefined, league: League): WeeklyLine {
  if (!w || w.GS === 0 || w.outs === 0) return { kind: 'P', GS: w?.GS ?? 0, outs: w?.outs ?? 0, value: null, valid: false }
  const value = (13 * w.HR + 3 * (w.BB + w.HBP) - 2 * w.SO) / (w.outs / 3) + league.totals.cfip
  return { kind: 'P', GS: w.GS, outs: w.outs, value, valid: true }
}

export type QuestionResult = {
  a: WeeklyLine
  b: WeeklyLine
  /** 두 선수 모두 표본이 충분한지. false면 전원 정답 */
  valid: boolean
  winner: Side | null
  correct: boolean
}

export type ChallengeScore = { results: QuestionResult[]; correctCount: number; score: number }

export function scoreChallenge(qs: readonly ChallengeQuestion[], picks: readonly (Side | null)[], week: RawWeek, league: League): ChallengeScore {
  const hit = new Map(week.hitters.map((w) => [w.id, w]))
  const pit = new Map(week.pitchers.map((w) => [w.id, w]))
  const results = qs.map((q, i): QuestionResult => {
    const a = q.kind === 'H' ? hitterWeekly(hit.get(q.a.id), league) : pitcherWeekly(pit.get(q.a.id), league)
    const b = q.kind === 'H' ? hitterWeekly(hit.get(q.b.id), league) : pitcherWeekly(pit.get(q.b.id), league)
    const valid = a.valid && b.valid
    let winner: Side | null = null
    if (valid) {
      // 같은 값이면 왼쪽(a)을 이긴 것으로 본다 (데모 규칙)
      winner = q.kind === 'H' ? (a.value! >= b.value! ? 'a' : 'b') : a.value! <= b.value! ? 'a' : 'b'
    }
    return { a, b, valid, winner, correct: !valid || picks[i] === winner }
  })
  const correctCount = results.filter((r) => r.correct).length
  const score = correctCount * POINTS_PER_QUESTION + (correctCount === qs.length ? PERFECT_BONUS : 0)
  return { results, correctCount, score }
}
