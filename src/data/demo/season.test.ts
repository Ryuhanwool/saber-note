import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDataSource } from '../registry'
import type { InningCounts, RawDataset, RawHitter, RawPitcher } from '../types'
import { generateDemoLeague } from './generate'
import { DEMO_BASE_DATE, SEASON_DAYS, addDays, createDemoSeason, kstDate, type HitterDay, type PitcherDay } from './season'

const source = getDataSource('demo')
const at = (d: string) => source.loadDay!(d)
const ROUTINE: (keyof RawHitter)[] = ['PA', 'BB', 'HBP', 'SO', 'HR', 'S1', 'D2', 'D3', 'SB', 'CS']
const PITCH: (keyof RawPitcher)[] = ['outs', 'TBF', 'SO', 'BB', 'HR', 'HBP', 'H', 'ER']
const PH = ['early', 'late', 'extra'] as const
const sum = (c: InningCounts) => c.early + c.late + c.extra
const wl = (c: { won: InningCounts; lost: InningCounts }, ph: (typeof PH)[number]) => c.won[ph] + c.lost[ph]

afterEach(() => vi.useRealTimers())

describe('하루 단위 기록 (최근 144경기)', () => {
  it('기준일 기록은 생성기의 시즌 기록과 같다 (기본 기록·클러치 모두)', async () => {
    const base = generateDemoLeague()
    const ds = await at(DEMO_BASE_DATE)
    expect(ds.meta.asOf).toBe(DEMO_BASE_DATE)
    ds.hitters.forEach((h, i) => {
      for (const k of ROUTINE) expect(h[k], `${h.name} ${k}`).toBe(base.hitters[i][k])
      expect(h.clutch).toEqual(base.hitters[i].clutch)
    })
    ds.pitchers.forEach((p, i) => {
      for (const k of PITCH) expect(p[k], `${p.name} ${k}`).toBe(base.pitchers[i][k])
      expect(p.clutch).toEqual(base.pitchers[i].clutch)
    })
  })

  it('같은 날짜는 언제 불러도, 새로 만들어도 같은 기록이다 (저장 없음)', async () => {
    const lg = generateDemoLeague()
    const fresh = createDemoSeason(20261017, lg.hitters, lg.pitchers, lg.hitterRates, lg.pitcherRates)
    for (const d of ['2026-11-11', '2026-08-02', '2027-05-30']) {
      const a = await at(d), b = await at(d)
      expect(b.hitters).toEqual(a.hitters)
      expect(fresh.at(d).hitters).toEqual(a.hitters)
      expect(fresh.at(d).pitchers).toEqual(a.pitchers)
    }
  })

  it('하루 변화 = 그날 경기 − 145일 전 경기 (어제와 오늘을 함께 계산)', async () => {
    const lg = generateDemoLeague()
    const season = createDemoSeason(20261017, lg.hitters, lg.pitchers, lg.hitterRates, lg.pitcherRates)
    for (const d of ['2026-11-11', '2026-12-25', '2026-07-01']) {
      const today = await at(d), yest = await at(addDays(d, -1))
      today.hitters.forEach((h, i) => {
        const add = season.dayOf(d, h.id) as HitterDay | null, drop = season.dayOf(addDays(d, -SEASON_DAYS), h.id) as HitterDay | null
        for (const k of ROUTINE) expect(h[k] as number - (yest.hitters[i][k] as number), `${d} ${h.name} ${k}`).toBe(((add?.[k as 'PA'] ?? 0) - (drop?.[k as 'PA'] ?? 0)))
      })
      today.pitchers.forEach((p, i) => {
        const add = season.dayOf(d, p.id) as PitcherDay | null, drop = season.dayOf(addDays(d, -SEASON_DAYS), p.id) as PitcherDay | null
        for (const k of PITCH) expect(p[k] as number - (yest.pitchers[i][k] as number)).toBe((add?.[k as 'outs'] ?? 0) - (drop?.[k as 'outs'] ?? 0))
      })
    }
  })

  it('하루 경기는 현실적인 크기다: 타자 0~6타석, 투수 하루 9이닝 이하, 출장 경기는 144 이하', async () => {
    const lg = generateDemoLeague()
    const season = createDemoSeason(20261017, lg.hitters, lg.pitchers, lg.hitterRates, lg.pitcherRates)
    for (let n = -300; n <= 300; n += 7) {
      const d = addDays(DEMO_BASE_DATE, n)
      for (const h of lg.hitters) {
        const g = season.dayOf(d, h.id) as HitterDay | null
        if (g) expect(g.PA, `${d} ${h.name}`).toBeLessThanOrEqual(6)
      }
      for (const p of lg.pitchers) {
        const g = season.dayOf(d, p.id) as PitcherDay | null
        if (g) expect(g.outs).toBeLessThanOrEqual(27)
      }
    }
    const ds = await at('2027-03-01')
    for (const x of [...ds.hitters, ...ds.pitchers]) expect(x.clutch!.games).toBeLessThanOrEqual(SEASON_DAYS)
  })

  it('어느 날짜든 기록 규칙을 지킨다 (클러치 성공 ≤ 기회, 홈런 ≤ 안타, 탈삼진 ≤ 아웃)', async () => {
    const check = (ds: RawDataset) => {
      for (const h of ds.hitters) {
        const c = h.clutch!
        for (const ph of PH) {
          const hits = wl(c.goAhead, ph) + wl(c.tying, ph) + wl(c.chase1, ph) + wl(c.chase2, ph) + wl(c.chase3, ph)
          expect(hits).toBeLessThanOrEqual(c.battingChances[ph])
          expect(wl(c.steals, ph)).toBeLessThanOrEqual(c.stealChances[ph])
          expect(c.stealRuns.won[ph]).toBeLessThanOrEqual(c.steals.won[ph])
          expect(wl(c.defensePlays, ph)).toBeLessThanOrEqual(c.defenseChances[ph])
        }
        expect(h.BB + h.HBP + h.SO + h.HR + h.S1 + h.D2 + h.D3).toBeLessThanOrEqual(h.PA)
        expect(h.SB + h.CS).toBeLessThanOrEqual(h.S1 + h.BB + h.HBP)
        if (h.pos === 'DH') expect(sum(c.defenseChances)).toBe(0)
      }
      for (const p of ds.pitchers) {
        const c = p.clutch!
        for (const ph of PH) {
          expect(c.escapes[ph]).toBeLessThanOrEqual(c.crisis[ph])
          expect(c.escapesLastK[ph]).toBeLessThanOrEqual(c.escapes[ph])
          expect(c.leadHeld1[ph]).toBeLessThanOrEqual(c.leadApps1[ph])
        }
        expect(p.HR).toBeLessThanOrEqual(p.H)
        expect(p.SO).toBeLessThanOrEqual(p.outs)
        expect(p.outs).toBeGreaterThan(0)
      }
    }
    for (const d of ['2026-11-09', '2026-11-11', '2026-06-15', '2027-09-01', '2030-01-01']) check(await at(d))
  })

  it('한국 시간 0시에 날짜가 바뀐다 (load는 오늘 기록)', async () => {
    expect(kstDate(new Date('2026-11-10T14:59:59Z'))).toBe('2026-11-10')
    expect(kstDate(new Date('2026-11-10T15:00:00Z'))).toBe('2026-11-11')
    expect(kstDate(new Date('2026-11-09T15:00:00Z'))).toBe('2026-11-10')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-10T14:59:59Z'))
    expect((await source.load()).meta.asOf).toBe('2026-11-10')
    vi.setSystemTime(new Date('2026-11-10T15:00:00Z'))
    const next = await source.load()
    expect(next.meta.asOf).toBe('2026-11-11')
    expect(next.hitters).toEqual((await at('2026-11-11')).hitters)
  })

  it('날짜 형식이 아니면 오류', () => {
    expect(() => addDays('2026/11/10', 1)).toThrow()
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})
