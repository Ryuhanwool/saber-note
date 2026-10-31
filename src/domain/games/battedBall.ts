// 게임 4. 이 타구, 안타일까?: 타구 속도·발사각에 타자의 발과 상대 수비수까지 보고 안타인지 맞힌다.
import type { FieldPosition } from '../../data/types'
import { metricAvailable } from '../availability'
import type { HitterPlayer, League } from '../players'
import { pick, type Rand } from '../random'

export const BALLS_PER_ROUND = 10
export type Direction = 'L' | 'C' | 'R'

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))

/** 기본 기대 타율: 타구 속도(km/h)·발사각(°)만으로 본 안타 확률 (데모 간이 모델) */
export function baseXba(ev: number, la: number): number {
  let p: number
  if (la < -10) p = 0.1 + ((ev - 120) / 60) * 0.25
  else if (la < 8) p = 0.18 + ((ev - 110) / 70) * 0.45
  else if (la <= 32) p = 0.3 + ((ev - 110) / 60) * 0.62
  else if (la <= 50) p = ev > 160 ? 0.45 : 0.05 + ((ev - 110) / 50) * 0.25
  else p = 0.02
  if (ev >= 158 && la >= 22 && la <= 35) p = Math.max(p, 0.9)
  return clamp(p, 0.01, 0.97)
}

/** 발사각·방향으로 타구를 처리할 포지션 (땅볼은 두 포지션 중 하나) */
export function fielderPosition(la: number, dir: Direction, rand: Rand): Exclude<FieldPosition, 'DH'> {
  if (la < 10) return dir === 'L' ? pick(['3B', 'SS'] as const, rand) : dir === 'C' ? pick(['SS', '2B'] as const, rand) : pick(['2B', '1B'] as const, rand)
  if (la > 50) return dir === 'L' ? '3B' : dir === 'C' ? 'SS' : '1B'
  return dir === 'L' ? 'LF' : dir === 'C' ? 'CF' : 'RF'
}

/**
 * 그 팀에서 그 포지션 수비 이닝이 가장 많은 선수.
 * 300타석 기준을 쓰지 않는다: 실제 데이터에서는 한 포지션에 300타석 넘는 선수가 둘이거나 없을 수 있다.
 * 이닝이 같으면 목록에서 먼저 나온 선수, 수비 이닝 기록이 있는 선수가 없으면 null.
 */
export function primaryFielder(league: League, team: string, pos: FieldPosition): HitterPlayer | null {
  let best: HitterPlayer | null = null
  for (const p of league.hitters) {
    if (p.team !== team || p.raw.pos !== pos || p.m.inn === null) continue
    if (!best || p.m.inn > best.m.inn!) best = p
  }
  return best
}

export type BallType = '홈런' | '내야 안타' | '단타' | '2루타' | '3루타'
export type PlayReason = 'home-run' | 'popup' | 'neutral' | 'speed-up' | 'speed-down' | 'defense-good' | 'defense-bad'

export type BattedBallPlay = {
  batter: HitterPlayer
  /** 수비 팀 */
  team: string
  fielderPos: Exclude<FieldPosition, 'DH'>
  /** 그 포지션 주전 수비수. 찾지 못하면 null (수비 보정 없음) */
  fielder: HitterPlayer | null
  ev: number
  la: number
  dir: Direction
  /** 위에서 본 그림용 각도(°) */
  deg: number
  base: number
  /** 타자 주루 보정 */
  speedAdj: number
  /** 상대 수비 보정 */
  defenseAdj: number
  /** 최종 안타 확률 */
  p: number
  hit: boolean
  type: BallType | null
  /** 빠른 발로 한 베이스 더 */
  extraBase: boolean
  homeRunZone: boolean
  popup: boolean
  /** 발·수비 보정 때문에 50%를 사이에 두고 결과 예상이 뒤집혔는지 */
  flipped: boolean
  reason: PlayReason
}

// 데모 기준: 스프린트 스피드 평균 8.2 m/s, 표준편차 0.3 m/s
const SPRINT_AVG = 8.2
const SPRINT_SD = 0.3

export function makePlay(league: League, batters: readonly HitterPlayer[], rand: Rand): BattedBallPlay | null {
  const teams = [...new Set(league.hitters.map((p) => p.team))]
  if (!batters.length || teams.length < 2) return null
  const batter = pick(batters, rand)
  const team = pick(teams.filter((t) => t !== batter.team), rand)
  const ev = 95 + rand() * 90
  const la = -25 + rand() * 80
  const dir = pick(['L', 'C', 'R'] as const, rand)
  const fielderPos = fielderPosition(la, dir, rand)
  const fielder = primaryFielder(league, team, fielderPos)
  const base = baseXba(ev, la)
  const homeRunZone = ev >= 158 && la >= 22 && la <= 35
  const popup = la > 50

  // 출처에 없는 기록(스프린트 스피드·OAA)은 보정하지 않는다
  const sprint = metricAvailable(league, 'sprint') ? batter.m.sprint : null
  const oaa = metricAvailable(league, 'oaa') && fielder ? fielder.m.oaa : null
  let speedAdj = 0, defenseAdj = 0
  if (!homeRunZone && !popup) {
    const z = sprint === null ? 0 : (sprint - SPRINT_AVG) / SPRINT_SD
    speedAdj = la < 10 ? 0.05 * z * (ev < 150 ? 1 : 0.5) : 0.015 * z
    defenseAdj = -0.04 * ((oaa ?? 0) / 5)
  }
  const p = clamp(base + speedAdj + defenseAdj, 0.01, 0.97)
  const hit = rand() < p

  let type: BallType | null = null
  let extraBase = false
  if (hit) {
    if (homeRunZone) type = '홈런'
    else if (la < 10) type = ev < 135 ? '내야 안타' : '단타'
    else if (ev >= 148) {
      const r = rand()
      const xbt = batter.m.xbt
      if (sprint !== null && sprint > 8.6 && r < 0.08) {
        type = '3루타'
        extraBase = true
      } else if (r < 0.3 + 0.5 * ((xbt ?? 0.45) - 0.45)) {
        type = '2루타'
        extraBase = xbt !== null && league.totals.xbt !== null && xbt > league.totals.xbt
      } else type = '단타'
    } else type = '단타'
  }

  return {
    batter, team, fielderPos, fielder, ev, la, dir,
    deg: { L: -30, C: 0, R: 30 }[dir] + (rand() - 0.5) * 20,
    base, speedAdj, defenseAdj, p, hit, type, extraBase, homeRunZone, popup,
    flipped: base >= 0.5 !== p >= 0.5,
    reason: playReason(homeRunZone, popup, speedAdj, defenseAdj),
  }
}

function playReason(hr: boolean, popup: boolean, spd: number, def: number): PlayReason {
  if (hr) return 'home-run'
  if (popup) return 'popup'
  const s = Math.abs(spd), d = Math.abs(def)
  if (s < 0.008 && d < 0.008) return 'neutral'
  if (s >= d) return spd > 0 ? 'speed-up' : 'speed-down'
  return def < 0 ? 'defense-good' : 'defense-bad'
}
