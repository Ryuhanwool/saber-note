// 데모 주간 기록: 선수의 실력 확률(HitterRates·PitcherRates)로 한 주 경기를 흉내 낸다.
// 데모 HTML의 simHitterWeek·simPitcherWeek와 같은 규칙. 데모는 매번 Math.random을 썼지만,
// 여기서는 주차 이름으로 시드를 정해 같은 주차는 언제나 같은 기록이 나오게 했다.
import type { PlayerId, RawWeek, RawWeeklyHitting, RawWeeklyPitching } from '../types'
import type { HitterRates, PitcherRates } from './generate'
import { mulberry32, type Rand } from './random'

/** 문자열 → 32비트 시드 (FNV-1a) */
function hashSeed(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function hitterWeek(id: PlayerId, r: HitterRates, rand: Rand): RawWeeklyHitting {
  // 15%는 부상·휴식으로 적게 나온다 (4~9타석), 나머지는 20~28타석
  const PA = rand() < 0.15 ? 4 + Math.floor(rand() * 6) : 20 + Math.floor(rand() * 9)
  const w: RawWeeklyHitting = { id, PA, BB: 0, HBP: 0, SO: 0, HR: 0, S1: 0, D2: 0, D3: 0 }
  for (let i = 0; i < PA; i++) {
    let x = rand()
    if ((x -= r.bb) < 0) w.BB++
    else if ((x -= r.hbp) < 0) w.HBP++
    else if ((x -= r.k) < 0) w.SO++
    else if ((x -= r.hr) < 0) w.HR++
    else if (rand() < r.babip) {
      const y = rand()
      if (y < r.d3) w.D3++
      else if (y < r.d3 + r.d2) w.D2++
      else w.S1++
    }
  }
  return w
}

function pitcherWeek(id: PlayerId, r: PitcherRates, rand: Rand): RawWeeklyPitching {
  // 12%는 등판 없음, 18%는 2번 선발, 나머지는 1번
  const u = rand()
  const GS = u < 0.12 ? 0 : u < 0.3 ? 2 : 1
  const w: RawWeeklyPitching = { id, GS, outs: 0, SO: 0, BB: 0, HBP: 0, HR: 0 }
  for (let g = 0; g < GS; g++) {
    const o = 15 + Math.floor(rand() * 7)
    w.outs += o
    const tbf = Math.round((o / 3) * 4.25)
    for (let i = 0; i < tbf; i++) {
      let x = rand()
      if ((x -= r.k) < 0) w.SO++
      else if ((x -= r.bb + r.hbp) < 0) w.BB++ // 데모는 볼넷·몸에 맞는 공을 함께 셌다
      else if ((x -= r.hr) < 0) w.HR++
    }
  }
  return w
}

export function simulateWeek(
  weekId: string,
  ids: PlayerId[],
  rates: { hitter: Map<PlayerId, HitterRates>; pitcher: Map<PlayerId, PitcherRates> },
): RawWeek {
  const week: RawWeek = { hitters: [], pitchers: [] }
  for (const id of ids) {
    // 선수마다 따로 시드를 둬서, 요청한 선수 목록이 달라도 같은 선수는 같은 기록이 나오게 한다
    const rand = mulberry32(hashSeed(`${weekId}|${id}`))
    const h = rates.hitter.get(id)
    const p = rates.pitcher.get(id)
    if (h) week.hitters.push(hitterWeek(id, h, rand))
    else if (p) week.pitchers.push(pitcherWeek(id, p, rand))
  }
  return week
}
