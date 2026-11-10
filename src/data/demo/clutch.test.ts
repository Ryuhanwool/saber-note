import { describe, expect, it } from 'vitest'
import { getDataSource } from '../registry'
import type { InningCounts, WinLossCounts } from '../types'
import { generateDemoLeague } from './generate'

const ds = await getDataSource('demo').load()
const PH = ['early', 'late', 'extra'] as const
const sum = (c: InningCounts) => c.early + c.late + c.extra
const wl = (c: WinLossCounts, ph: (typeof PH)[number]) => c.won[ph] + c.lost[ph]
const isCount = (n: number) => Number.isInteger(n) && n >= 0
const leaves = (o: object): number[] => Object.values(o).flatMap((x) => (typeof x === 'number' ? [x] : leaves(x as object)))

describe('가상 리그 클러치 기록 (data)', () => {
  it('모든 선수에게 있고, 출처도 있다고 알린다', () => {
    expect(ds.meta.available.clutch).toBe(true)
    for (const p of [...ds.hitters, ...ds.pitchers]) expect(p.clutch, p.name).not.toBeNull()
  })

  it('같은 시드면 같은 기록이 나온다', () => {
    const a = generateDemoLeague(), b = generateDemoLeague()
    expect(a.hitters.map((h) => h.clutch)).toEqual(b.hitters.map((h) => h.clutch))
    expect(a.pitchers.map((p) => p.clutch)).toEqual(b.pitchers.map((p) => p.clutch))
  })

  it('타자: 성공 횟수는 기회 수를 넘지 않고, 도루 뒤 득점은 도루를 넘지 않는다', () => {
    for (const h of ds.hitters) {
      const c = h.clutch!
      for (const ph of PH) {
        const hits = wl(c.goAhead, ph) + wl(c.tying, ph) + wl(c.chase1, ph) + wl(c.chase2, ph) + wl(c.chase3, ph)
        expect(hits, `${h.name} ${ph}`).toBeLessThanOrEqual(c.battingChances[ph])
        expect(wl(c.steals, ph)).toBeLessThanOrEqual(c.stealChances[ph])
        expect(c.stealRuns.won[ph]).toBeLessThanOrEqual(c.steals.won[ph])
        expect(c.stealRuns.lost[ph]).toBeLessThanOrEqual(c.steals.lost[ph])
        expect(wl(c.defensePlays, ph)).toBeLessThanOrEqual(c.defenseChances[ph])
      }
      for (const v of leaves(c)) expect(isCount(v)).toBe(true)
      if (h.pos === 'DH') expect(sum(c.defenseChances)).toBe(0)
    }
  })

  it('투수: 탈출 ≤ 위기, 삼진·볼넷 없이 ≤ 탈출, 리드 지킴 ≤ 리드 등판', () => {
    for (const p of ds.pitchers) {
      const c = p.clutch!
      for (const ph of PH) {
        expect(c.escapes[ph]).toBeLessThanOrEqual(c.crisis[ph])
        expect(c.escapesLastK[ph]).toBeLessThanOrEqual(c.escapes[ph])
        expect(c.escapesNoBB[ph]).toBeLessThanOrEqual(c.escapes[ph])
        expect(c.leadHeld1[ph]).toBeLessThanOrEqual(c.leadApps1[ph])
        expect(c.leadHeldMulti[ph]).toBeLessThanOrEqual(c.leadAppsMulti[ph])
      }
      expect(c.games).toBeGreaterThan(0)
    }
  })

  it('운의 영향이 크다: 기회 대비 성공률이 실력 순서와 꼭 같지는 않다 (리그에 역전타 0개 주전도, 많은 주전도 있다)', () => {
    const regulars = ds.hitters.filter((h) => h.PA >= 300)
    const goAhead = regulars.map((h) => sum(h.clutch!.goAhead.won) + sum(h.clutch!.goAhead.lost))
    expect(Math.max(...goAhead)).toBeGreaterThanOrEqual(2 * Math.min(...goAhead) + 3)
  })
})
