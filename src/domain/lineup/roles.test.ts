import { describe, expect, it } from 'vitest'
import { DEMO_BASE_DATE } from '../../data/demo/season'
import { getDataSource } from '../../data/registry'
import type { RawDataset } from '../../data/types'
import { buildLeague } from '../league'
import type { PitcherPlayer } from '../players'
import { bullpenByTeam, bullpenRoles, closerReason, compareCloser, leadsHeld } from './roles'

const source = getDataSource('demo')
const baseDs = await source.loadDay!(DEMO_BASE_DATE)
const basis = buildLeague(baseDs)
const fnv = (s: string) => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

describe('불펜 역할 (domain)', () => {
  it('구단마다 세이브가 가장 많은 불펜 투수 1명이 마무리, 나머지 불펜은 중간, 선발은 역할 없음', () => {
    const roles = bullpenRoles(basis)
    const teams = new Set(basis.pitchers.map((p) => p.team))
    for (const team of teams) {
      const rp = basis.pitchers.filter((p) => p.team === team && p.raw.role === 'RP')
      const closers = rp.filter((p) => roles.get(p.id) === 'CL')
      expect(closers, team).toHaveLength(1)
      expect(closers[0].raw.SV).toBe(Math.max(...rp.map((p) => p.raw.SV!)))
      for (const p of rp) if (p !== closers[0]) expect(roles.get(p.id)).toBe('MR')
    }
    for (const p of basis.pitchers.filter((x) => x.raw.role === 'SP')) expect(roles.has(p.id)).toBe(false)
    expect([...roles.values()].filter((r) => r === 'CL')).toHaveLength(6)
  })

  it('동점 규칙: 세이브가 같으면 리드를 지킨 횟수, 그것도 같으면 WAR, 그다음 이름순', () => {
    const team = basis.pitchers.find((p) => p.raw.role === 'RP')!.team
    const ds: RawDataset = structuredClone(baseDs)
    const [a, b] = ds.pitchers.filter((p) => p.team === team && p.role === 'RP')
    // 세이브를 같게, 리드 지킴은 b가 1 더 많게
    a.SV = b.SV = 4
    a.clutch!.leadHeld1 = { early: 0, late: 3, extra: 0 }
    a.clutch!.leadHeldMulti = { early: 0, late: 5, extra: 0 }
    b.clutch!.leadHeld1 = { early: 0, late: 4, extra: 0 }
    b.clutch!.leadHeldMulti = { early: 0, late: 5, extra: 0 }
    const lg = buildLeague(ds)
    expect(bullpenRoles(lg).get(b.id)).toBe('CL')
    expect(bullpenRoles(lg).get(a.id)).toBe('MR')
    expect(closerReason(lg, team)).toMatch(/리드를 지킨 횟수/)

    // 세이브·리드 지킴이 같으면 WAR, 그것도 같으면 이름
    const mk = (name: string, SV: number, held: number, WAR: number) =>
      ({ name, raw: { SV, clutch: { leadHeld1: { early: 0, late: held, extra: 0 }, leadHeldMulti: { early: 0, late: 0, extra: 0 } } }, m: { WAR } }) as unknown as PitcherPlayer
    expect(compareCloser(mk('가', 5, 8, 1.0), mk('나', 6, 1, 0.1))).toBeGreaterThan(0) // 세이브 우선
    expect(compareCloser(mk('가', 5, 8, 0.1), mk('나', 5, 7, 2.0))).toBeLessThan(0) // 리드 지킴
    expect(compareCloser(mk('가', 5, 8, 0.4), mk('나', 5, 8, 0.9))).toBeGreaterThan(0) // WAR
    expect(compareCloser(mk('가', 5, 8, 0.4), mk('나', 5, 8, 0.4))).toBeLessThan(0) // 이름순
    expect(leadsHeld(mk('가', 0, 3, 0))).toBe(3)
  })

  it('역할을 정해도 리그 평균은 그대로다 (세이브·홀드를 넣기 전 리그 기준값 지문)', async () => {
    const before: Record<string, string> = { '2026-11-10': '30ab9cfa', '2026-11-11': '832a4b25', '2026-09-21': 'e02f1588', '2027-09-06': '70336a78' }
    for (const [d, h] of Object.entries(before)) {
      const lg = buildLeague(await source.loadDay!(d))
      bullpenRoles(lg)
      expect(fnv(JSON.stringify(lg.totals)), d).toBe(h)
    }
  })

  it('구단마다 불펜 순서가 있고, 마무리 이유를 말할 수 있다', () => {
    for (const [team, list] of bullpenByTeam(basis)) {
      expect(list.length).toBeGreaterThan(0)
      expect(closerReason(basis, team)).toBeTruthy()
    }
  })
})
