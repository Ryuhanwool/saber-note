// 가상 팬 라인업 300개 (포지션별 픽 순위용).
// 선수 가치와 인기를 반영하되 운도 섞어 1위에만 몰리지 않게 한다. 기준 리그(기준일 기록)와 고정 시드만 쓰므로 날짜와 상관없이 늘 같다.
import type { PlayerId } from '../../data/types'
import { seededRandom, type Rand } from '../random'
import type { League, Player } from '../players'
import { playerValue } from '../value/value'
import { candidates, emptyLineup, place, type Lineup } from './lineup'
import type { BullpenRoles } from './roles'
import { LINEUP_SLOTS } from './slots'

export const FAN_COUNT = 300
const FAN_SEED = 'saber-note-lineup-fans-v1'
/** 가치(억 원) 1당 점수 */
const VALUE_WEIGHT = 0.3
/** 응원 팀 선수에게 주는 가중치 배수 */
const FAVORITE_BOOST = 2.2

/** 0 근처에 모이는 고정 난수 (−1.5~1.5) */
const bell = (r: Rand) => r() + r() + r() - 1.5

/** 인기: 구단 인기 + 선수 인기. 시드로 고정 (기록과 상관없는 「팬덤」) */
export function popularity(p: Player): number {
  return 0.8 * bell(seededRandom(`team:${p.team}`)) + 0.9 * bell(seededRandom(`pop:${p.id}`))
}

function weightedPick<T>(items: readonly T[], weight: (x: T) => number, r: Rand): T {
  const ws = items.map(weight)
  let x = r() * ws.reduce((a, b) => a + b, 0)
  for (let i = 0; i < items.length; i++) if ((x -= ws[i]) < 0) return items[i]
  return items[items.length - 1]
}

const cache = new WeakMap<League, Lineup[]>()

/** 가상 팬 라인업 (기준 리그로 한 번 만들어 둔다) */
export function virtualFanLineups(basis: League, roles: BullpenRoles): Lineup[] {
  const hit = cache.get(basis)
  if (hit) return hit
  const score = new Map<PlayerId, number>()
  for (const p of [...basis.hitters, ...basis.pitchers]) score.set(p.id, VALUE_WEIGHT * (playerValue(basis, p).total / 1e8) + popularity(p))
  const teams = [...new Set(basis.hitters.map((h) => h.team))]
  const pool = Object.fromEntries(LINEUP_SLOTS.map((s) => [s, candidates(basis, s, roles)])) as Record<(typeof LINEUP_SLOTS)[number], Player[]>
  const r = seededRandom(FAN_SEED)
  const fans: Lineup[] = []
  for (let f = 0; f < FAN_COUNT; f++) {
    // 팬마다 응원 팀 (인기 많은 구단을 조금 더 자주)
    const favorite = weightedPick(teams, (t) => Math.exp(0.8 * bell(seededRandom(`team:${t}`))), r)
    let l = emptyLineup()
    for (const slot of LINEUP_SLOTS) {
      const left = pool[slot].filter((p) => !Object.values(l.slots).includes(p.id))
      if (!left.length) continue
      const chosen = weightedPick(left, (p) => Math.exp(score.get(p.id)!) * (p.team === favorite ? FAVORITE_BOOST : 1), r)
      const res = place(l, slot, chosen, roles)
      if (res.ok) l = res.lineup
    }
    fans.push(l)
  }
  cache.set(basis, fans)
  return fans
}
