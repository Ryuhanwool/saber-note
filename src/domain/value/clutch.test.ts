import { describe, expect, it } from 'vitest'
import { getDataSource } from '../../data/registry'
import type { InningCounts, RawDataset, RawHitterClutch, RawPitcherClutch, WinLossCounts } from '../../data/types'
import { buildLeague } from '../league'
import type { HitterPlayer, PitcherPlayer } from '../players'
import { clutchScore } from './clutch'
import { CLUTCH_POINTS_PER_WIN } from './scoring'

const base = await getDataSource('demo').load()
const league = buildLeague(base)

const z = (): InningCounts => ({ early: 0, late: 0, extra: 0 })
const zwl = (): WinLossCounts => ({ won: z(), lost: z() })
const emptyHitter = (): RawHitterClutch => ({
  games: 100, battingChances: z(), goAhead: zwl(), tying: zwl(), chase1: zwl(), chase2: zwl(), chase3: zwl(),
  stealChances: z(), steals: zwl(), stealRuns: zwl(), defenseChances: z(), defensePlays: zwl(),
})
const emptyPitcher = (): RawPitcherClutch => ({
  games: 50, crisis: z(), escapes: z(), escapesLastK: z(), escapesNoBB: z(), leadApps1: z(), leadHeld1: z(), leadAppsMulti: z(), leadHeldMulti: z(),
})

/** 데모 리그에서 첫 타자·첫 투수의 클러치 기록만 바꾼 리그 */
function leagueWith(h: RawHitterClutch | null, p: RawPitcherClutch | null = null) {
  const ds: RawDataset = structuredClone(base)
  if (h) ds.hitters[0].clutch = h
  if (p) ds.pitchers[0].clutch = p
  const lg = buildLeague(ds)
  return { lg, H: lg.hitters[0] as HitterPlayer, P: lg.pitchers[0] as PitcherPlayer }
}

describe('클러치 점수 (domain)', () => {
  it('팀이 진 경기의 역전타·동점타는 점수에 들어가지 않는다', () => {
    const c = emptyHitter()
    c.goAhead.won.early = 2
    c.tying.won.early = 1
    const before = leagueWith(c)
    const lost = structuredClone(c)
    lost.goAhead.lost = { early: 5, late: 3, extra: 1 }
    lost.tying.lost = { early: 4, late: 2, extra: 1 }
    const after = leagueWith(lost)
    const a = clutchScore(before.lg, before.H)!, b = clutchScore(after.lg, after.H)!
    expect(a.points).toBe(2 * 3 + 2)
    expect(b.points).toBe(a.points)
    expect(b.lostGoAheadOrTying).toBe(16)
    expect(b.evidence.find((e) => e.key === 'goAhead')!.count).toBe(2)
  })

  it('7회 이후 1.5배, 연장 2배가 적용된다 (타자·투수)', () => {
    for (const [ph, mult] of [['early', 1], ['late', 1.5], ['extra', 2]] as const) {
      const h = emptyHitter()
      h.goAhead.won[ph] = 1
      const p = emptyPitcher()
      p.escapes[ph] = 1
      p.leadHeld1[ph] = 1
      const { lg, H, P } = leagueWith(h, p)
      expect(clutchScore(lg, H)!.points, ph).toBeCloseTo(3 * mult, 10)
      expect(clutchScore(lg, P)!.points, ph).toBeCloseTo((1 + 2) * mult, 10)
    }
  })

  it('점수표: 추격타·도루·호수비, 위기 탈출 추가점, 리드 지키기', () => {
    const h = emptyHitter()
    h.chase1.won.early = 1 // 1
    h.chase2.won.early = 2 // 1
    h.chase3.won.early = 5 // 1
    h.steals.won.early = 2 // 1
    h.stealRuns.won.early = 1 // 0.5
    h.defensePlays.won.early = 1 // 1
    h.steals.lost.early = 3 // 진 경기 — 0
    const p = emptyPitcher()
    p.escapes.early = 2 // 2
    p.escapesLastK.early = 1 // 0.5
    p.escapesNoBB.early = 2 // 0.6
    p.leadHeldMulti.early = 1 // 1
    const { lg, H, P } = leagueWith(h, p)
    expect(clutchScore(lg, H)!.points).toBeCloseTo(5.5, 10)
    expect(clutchScore(lg, P)!.points).toBeCloseTo(4.1, 10)
  })

  it('기회가 없으면 기대 점수 0, 기회가 같으면 리그 평균 비율만큼 기대한다', () => {
    const { lg, H } = leagueWith(emptyHitter())
    const r = clutchScore(lg, H)!
    expect(r.expected).toBe(0)
    expect(r.score).toBe(r.points)

    // 같은 기회를 받은 두 선수의 기대 점수는 같다
    const ds = structuredClone(base)
    ds.hitters[1].clutch = { ...structuredClone(ds.hitters[1].clutch!), battingChances: ds.hitters[0].clutch!.battingChances, stealChances: ds.hitters[0].clutch!.stealChances, defenseChances: ds.hitters[0].clutch!.defenseChances }
    const lg2 = buildLeague(ds)
    expect(clutchScore(lg2, lg2.hitters[1])!.expected).toBeCloseTo(clutchScore(lg2, lg2.hitters[0])!.expected, 10)
  })

  it('리그 전체 클러치 점수 합은 0 (평균 선수 기준)이고, 승리 환산은 점수 ÷ 환산 비율', () => {
    const all = [...league.hitters, ...league.pitchers].map((p) => clutchScore(league, p)!)
    expect(all.reduce((a, r) => a + r.score, 0)).toBeCloseTo(0, 6)
    for (const r of all) expect(r.wins).toBeCloseTo(r.score / CLUTCH_POINTS_PER_WIN, 12)
  })

  it('출처가 클러치 기록이 없다고 알리면 null', () => {
    const ds = structuredClone(base)
    ds.meta.available.clutch = false
    for (const x of [...ds.hitters, ...ds.pitchers]) x.clutch = null
    const lg = buildLeague(ds)
    expect(clutchScore(lg, lg.hitters[0])).toBeNull()
    expect(clutchScore(lg, lg.pitchers[0])).toBeNull()
  })
})
