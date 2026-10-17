import { describe, expect, it } from 'vitest'
import golden from '../../../fixtures/demo-golden.json'
import { getDataSource } from '../registry'
import type { RawHitter, RawPitcher } from '../types'
import { DEMO_CONSTANTS } from '.'

type GoldenPlayer = Record<string, unknown> & { id: number }

const ds = await getDataSource('demo').load()
const goldenById = new Map((golden.players as GoldenPlayer[]).map((p) => [`demo:${p.id}`, p]))
// 골든(데모)은 지명타자의 일부 수비 항목이 아예 없다(undefined). 새 데이터는 null로 넣으므로 null로 맞춰 비교한다.
const g = (p: { id: string }, key: string) => goldenById.get(p.id)![key] ?? null

const HITTER_COUNTS = ['PA', 'BB', 'HBP', 'SO', 'HR', 'S1', 'D2', 'D3', 'SB', 'CS', 'xbt'] as const
const HITTER_TRACKING = ['ev', 'maxev', 'la', 'hard', 'barrel', 'xba', 'sprint', 'h2f'] as const
const FIELDING = ['inn', 'TC', 'E', 'DP', 'A_OF', 'rngR', 'errR', 'dpR', 'armR', 'frmR', 'blkR', 'csR', 'csp', 'drs', 'oaa', 'zr'] as const
const PITCHER_COUNTS = ['outs', 'TBF', 'SO', 'BB', 'HR', 'HBP', 'H', 'ER'] as const

describe('demo 데이터 출처: 데모 HTML과 같은 원시 기록', () => {
  it('선수 수와 순서가 같다', () => {
    expect(ds.hitters).toHaveLength(60)
    expect(ds.pitchers).toHaveLength(30)
    const ids = [...ds.hitters, ...ds.pitchers].map((p) => p.id).sort()
    expect(ids).toEqual([...goldenById.keys()].sort())
  })

  it('타자 기본 기록·트래킹·수비가 같다', () => {
    for (const h of ds.hitters) {
      const want = goldenById.get(h.id)!
      expect([h.name, h.team, h.pos, h.age]).toEqual([want.name, want.team, want.pos, want.age])
      for (const k of HITTER_COUNTS) expect(h[k], `${h.id} ${k}`).toBe(want[k])
      for (const k of HITTER_TRACKING) expect(h.tracking[k], `${h.id} ${k}`).toBe(want[k])
      for (const k of FIELDING) expect(h.fielding[k], `${h.id} ${k}`).toBe(g(h, k))
      const rt = (g(h, 'rt') as [string, number][] | null)?.map(([label, grade]) => ({ label, grade })) ?? null
      expect(h.fielding.ratings).toEqual(rt)
    }
  })

  it('투수 기본 기록·트래킹이 같다', () => {
    for (const p of ds.pitchers) {
      const want = goldenById.get(p.id)!
      expect([p.name, p.team, p.role, p.age]).toEqual([want.name, want.team, want.pos, want.age])
      for (const k of PITCHER_COUNTS) expect(p[k], `${p.id} ${k}`).toBe(want[k])
      expect([p.tracking.velo, p.tracking.spin, p.tracking.whiff]).toEqual([want.velo, want.spin, want.whiff])
      const mix = (want.mix as [string, number][]).map(([pitch, share]) => ({ pitch, share }))
      expect(p.tracking.mix).toEqual(mix)
    }
  })

  it('리그 상수가 같다', () => {
    const c = golden.constants
    expect(DEMO_CONSTANTS.woba).toEqual(c.W)
    expect([DEMO_CONSTANTS.wobaScale, DEMO_CONSTANTS.runsPerPA, DEMO_CONSTANTS.runSB, DEMO_CONSTANTS.runCS, DEMO_CONSTANTS.qualifiedPA])
      .toEqual([c.WSCALE, c.LG_RPA, c.RUN_SB, c.RUN_CS, c.poolMinPA])
    expect(DEMO_CONSTANTS.positionAdjust).toEqual(c.POSADJ)
  })

  it('타구 분포가 같다', async () => {
    const source = getDataSource('demo')
    for (const h of ds.hitters) {
      const want = golden.battedBalls[h.id.split(':')[1] as keyof typeof golden.battedBalls]
      expect(await source.loadBattedBalls(h.id)).toEqual(want)
    }
  })
})

describe('값 없음은 언제나 null', () => {
  const findUndefined = (v: unknown, path: string): string[] => {
    if (v === undefined) return [path]
    if (Array.isArray(v)) return v.flatMap((x, i) => findUndefined(x, `${path}[${i}]`))
    if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => findUndefined(x, `${path}.${k}`))
    return []
  }
  const shape = (p: RawHitter | RawPitcher) =>
    JSON.stringify(Object.keys(p).sort().map((k) => {
      const v = (p as Record<string, unknown>)[k]
      return v && typeof v === 'object' && !Array.isArray(v) ? [k, Object.keys(v).sort()] : k
    }))

  it('데이터셋 어디에도 undefined가 없다', () => {
    expect(findUndefined(ds, '$')).toEqual([])
  })

  it('같은 종류의 선수는 모두 같은 필드를 가진다', () => {
    expect(new Set(ds.hitters.map(shape)).size).toBe(1)
    expect(new Set(ds.pitchers.map(shape)).size).toBe(1)
  })

  it('지명타자는 실책·레인지 팩터용 기회·병살·보살·능력치를 포함한 모든 수비 항목이 null이다', () => {
    const dhs = ds.hitters.filter((h) => h.pos === 'DH')
    const fielder = ds.hitters.find((h) => h.pos === 'SS')!
    expect(dhs.length).toBeGreaterThan(0)
    for (const dh of dhs) {
      expect(Object.keys(dh.fielding).sort()).toEqual(Object.keys(fielder.fielding).sort())
      for (const [k, v] of Object.entries(dh.fielding)) expect(v, `${dh.name} ${k}`).toBeNull()
    }
  })

  it('포지션에 해당하지 않는 수비 항목은 null이다', () => {
    for (const h of ds.hitters) {
      if (h.pos === 'DH') continue
      const f = h.fielding
      const IF = ['1B', '2B', '3B', 'SS'].includes(h.pos), OF = ['LF', 'CF', 'RF'].includes(h.pos), C = h.pos === 'C'
      expect(f.DP === null, `${h.id} DP`).toBe(!IF)
      expect(f.dpR === null, `${h.id} dpR`).toBe(!IF)
      expect(f.A_OF === null, `${h.id} A_OF`).toBe(!OF)
      expect(f.armR === null, `${h.id} armR`).toBe(!OF)
      for (const k of ['csp', 'csR', 'frmR', 'blkR'] as const) expect(f[k] === null, `${h.id} ${k}`).toBe(!C)
      expect(f.oaa === null, `${h.id} oaa`).toBe(C)
      for (const k of ['inn', 'TC', 'E', 'rngR', 'errR', 'drs', 'zr', 'ratings'] as const) expect(f[k], `${h.id} ${k}`).not.toBeNull()
    }
  })
})
