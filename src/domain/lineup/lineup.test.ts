import { describe, expect, it } from 'vitest'
import { DEMO_BASE_DATE } from '../../data/demo/season'
import { getDataSource } from '../../data/registry'
import { addDays } from '../../data/demo/season'
import { buildLeague } from '../league'
import type { HitterPlayer, PitcherPlayer, Player } from '../players'
import { battingOrder, candidates, clearSlot, eligible, emptyLineup, lineupTotals, moveOrder, place, problems, sanitize, type Lineup } from './lineup'
import { bullpenRoles } from './roles'
import { HITTER_SLOTS, LINEUP_SLOTS, PITCHER_SLOTS, type LineupSlot } from './slots'

const source = getDataSource('demo')
const basis = buildLeague(await source.loadDay!(DEMO_BASE_DATE))
const roles = bullpenRoles(basis)
const league = buildLeague(await source.loadDay!(addDays(DEMO_BASE_DATE, 37))) // 다른 날짜 기록 + 기준일 역할
const all: Player[] = [...league.hitters, ...league.pitchers]
const hitterAt = (pos: string, k = 0) => league.hitters.filter((h) => h.raw.pos === pos)[k]
const sp = league.pitchers.find((p) => p.raw.role === 'SP')!
const closer = league.pitchers.find((p) => roles.get(p.id) === 'CL')!
const middle = league.pitchers.find((p) => roles.get(p.id) === 'MR')!

/** 12자리를 모두 채운 라인업 */
function full(): Lineup {
  let l = emptyLineup()
  const used = new Set<string>()
  for (const slot of LINEUP_SLOTS) {
    const p = candidates(league, slot, roles).find((c) => !used.has(c.id))!
    used.add(p.id)
    const r = place(l, slot, p, roles)
    if (!r.ok) throw new Error(slot)
    l = r.lineup
  }
  return l
}

describe('라인업 규칙 (domain)', () => {
  it('포지션에 맞지 않는 선수는 그 자리에 못 넣고, 지명타자는 모든 타자 가능', () => {
    for (const slot of HITTER_SLOTS.filter((s) => s !== 'DH')) {
      for (const p of all) expect(eligible(slot, p, roles), `${slot} ${p.name}`).toBe(p.type === 'H' && (p as HitterPlayer).raw.pos === slot)
    }
    for (const h of league.hitters) expect(eligible('DH', h, roles)).toBe(true)
    for (const p of league.pitchers) expect(eligible('DH', p, roles)).toBe(false)
    const ss = hitterAt('SS')
    expect(place(emptyLineup(), 'C', ss, roles)).toEqual({ ok: false, reason: 'not-eligible' })
    expect(place(emptyLineup(), 'DH', ss, roles).ok).toBe(true)
  })

  it('선발·중간·마무리는 각자 역할의 투수만 (역할은 기준일로 정한 것)', () => {
    for (const p of league.pitchers) {
      expect(eligible('SP', p, roles)).toBe(p.raw.role === 'SP')
      expect(eligible('MR', p, roles)).toBe(roles.get(p.id) === 'MR')
      expect(eligible('CL', p, roles)).toBe(roles.get(p.id) === 'CL')
    }
    for (const h of league.hitters) for (const s of PITCHER_SLOTS) expect(eligible(s, h, roles)).toBe(false)
    expect(place(emptyLineup(), 'CL', middle, roles).ok).toBe(false)
    expect(place(emptyLineup(), 'MR', closer, roles).ok).toBe(false)
    expect(place(emptyLineup(), 'SP', closer, roles).ok).toBe(false)
    expect(candidates(league, 'CL', roles)).toHaveLength(6)
    expect(candidates(league, 'MR', roles)).toHaveLength(6)
  })

  it('마무리 목록은 세이브 많은 순, 나머지는 예상 가치 높은 순', () => {
    const cl = candidates(league, 'CL', roles) as PitcherPlayer[]
    for (let i = 1; i < cl.length; i++) expect(cl[i - 1].raw.SV!).toBeGreaterThanOrEqual(cl[i].raw.SV!)
  })

  it('같은 선수는 두 자리에 넣을 수 없다 (지명타자 ↔ 수비 자리 포함)', () => {
    const c = hitterAt('C')
    const r1 = place(emptyLineup(), 'C', c, roles)
    if (!r1.ok) throw new Error()
    expect(place(r1.lineup, 'DH', c, roles)).toEqual({ ok: false, reason: 'duplicate', at: 'C' })
    // 같은 자리에 같은 선수를 다시 넣는 것은 괜찮다
    expect(place(r1.lineup, 'C', c, roles).ok).toBe(true)
    expect(problems(full(), league, roles)).toEqual([])
  })

  it('타순은 1~9번이 한 번씩, 투수 3명은 타순이 없다', () => {
    const l = full()
    const orders = HITTER_SLOTS.map((s) => battingOrder(l, s))
    expect([...orders].sort((a, b) => a! - b!)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    for (const s of PITCHER_SLOTS) expect(battingOrder(l, s)).toBeNull()
    // 타순 바꾸기
    const first = l.order[0], second = l.order[1]
    const moved = moveOrder(l, second, -1)
    expect(battingOrder(moved, second)).toBe(1)
    expect(battingOrder(moved, first)).toBe(2)
    expect(moveOrder(l, l.order[0], -1)).toBe(l) // 맨 앞은 더 못 올라감
    // 자리를 비우면 뒤 타순이 당겨지고, 다시 채우면 맨 뒤
    const cleared = clearSlot(l, l.order[3])
    expect(cleared.order).toHaveLength(8)
    expect(HITTER_SLOTS.map((s) => battingOrder(cleared, s)).filter(Boolean).sort((a, b) => a! - b!)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(problems(cleared, league, roles)).toEqual([])
  })

  it('저장돼 있던 라인업 정리: 모르는 선수·맞지 않는 자리·중복을 비우고 타순을 맞춘다', () => {
    const c = hitterAt('C'), ss = hitterAt('SS')
    const raw = { slots: { C: c.id, SS: c.id, DH: 'demo:99999', SP: closer.id, CL: closer.id, '1B': ss.id }, order: ['SS', 'C', 'C', 'DH', 'LF'] }
    const l = sanitize(raw, league, roles)
    expect(l.slots.C).toBe(c.id)
    expect(l.slots.SS).toBeNull() // 같은 선수 (포지션도 다름)
    expect(l.slots.DH).toBeNull()
    expect(l.slots.SP).toBeNull()
    expect(l.slots.CL).toBe(closer.id)
    expect(l.slots['1B']).toBeNull()
    expect(l.order).toEqual(['C'])
    expect(sanitize(null, league, roles)).toEqual(emptyLineup())
  })

  it('합계: 채운 선수의 예상 가치·WAR 합', () => {
    const l = full()
    const t = lineupTotals(l, league)
    expect(t.filled).toBe(12)
    const ids = LINEUP_SLOTS.map((s: LineupSlot) => l.slots[s]!)
    expect(t.war).toBeCloseTo(ids.reduce((a, id) => a + league.byId.get(id)!.m.WAR, 0), 10)
    expect(lineupTotals(emptyLineup(), league)).toEqual({ value: 0, war: 0, filled: 0 })
    expect(sp).toBeTruthy()
  })
})
