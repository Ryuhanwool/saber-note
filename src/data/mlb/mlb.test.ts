import { describe, expect, it } from 'vitest'
import { unavailableButPresent } from '../availability'
import { createMlbSource } from '.'
import { SAMPLE_OPTIONS } from './sample'
import { ftpsToMps, mphToKmh, percentToRate } from './units'

const source = createMlbSource(SAMPLE_OPTIONS)
const ds = await source.load()
const byName = (name: string) => ds.hitters.find((h) => h.name === name)!

describe('단위 변환', () => {
  it('mph → km/h, ft/s → m/s, 0~100 → 0~1', () => {
    expect(mphToKmh(100)).toBeCloseTo(160.9344, 10)
    expect(ftpsToMps(27)).toBeCloseTo(8.2296, 10)
    expect(percentToRate(42)).toBeCloseTo(0.42, 10)
    expect(mphToKmh(null)).toBeNull()
    expect(ftpsToMps(null)).toBeNull()
  })

  it('타자 트래킹·투수 구속·타구가 앱 단위로 들어온다', async () => {
    const ss = byName('표본 유격수')
    expect(ss.tracking.ev).toBeCloseTo(160.9344, 10)
    expect(ss.tracking.maxev).toBeCloseTo(112 * 1.609344, 10)
    expect(ss.tracking.sprint).toBeCloseTo(29.5 * 0.3048, 10)
    expect(ss.tracking.hard).toBeCloseTo(0.42, 10)
    expect(ss.tracking.barrel).toBeCloseTo(0.09, 10)
    expect(ss.tracking.h2f).toBe(4.3)
    expect(ds.pitchers[0].tracking.velo).toBeCloseTo(95 * 1.609344, 10)
    expect(ds.pitchers[0].tracking.whiff).toBeCloseTo(0.27, 10)
    const balls = await source.loadBattedBalls(ss.id)
    expect(balls[0].ev).toBeCloseTo(160.9344, 10)
  })
})

describe('MLB가 알리는 있음/없음', () => {
  const a = ds.meta.available

  it('OAA·타구 속도·스프린트 스피드는 있고, DRS·UZR 구성·ZR·능력치·전통 기록·추가 진루율은 없다', () => {
    expect(a.fielding.oaa).toBe(true)
    expect(a.hitterTracking.ev).toBe(true)
    expect(a.hitterTracking.sprint).toBe(true)
    for (const k of ['drs', 'zr', 'ratings', 'rngR', 'errR', 'inn', 'TC', 'E', 'DP', 'A_OF', 'csp'] as const) expect(a.fielding[k], k).toBe(false)
    expect(a.xbt).toBe(false)
    expect(a.pitcherTracking.mix).toBe(false)
  })

  it('경기 상황별(클러치) 기록은 없다 → 모든 선수 null', () => {
    expect(a.clutch).toBe(false)
    for (const p of [...ds.hitters, ...ds.pitchers]) expect(p.clutch, p.name).toBeNull()
  })

  it('없다고 알린 기록은 모든 선수에게 null이다', () => {
    expect(unavailableButPresent(ds)).toEqual([])
  })

  it('있는 기록이라도 해당 없는 선수는 null이다 (포수·지명타자의 OAA)', () => {
    expect(byName('표본 포수').fielding.oaa).toBeNull()
    expect(byName('표본 지명타자').fielding.oaa).toBeNull()
    expect(byName('표본 유격수').fielding.oaa).toBe(12)
  })

  it('타구 데이터 함수가 없으면 타구 기록도 없다고 알린다', async () => {
    const noBalls = createMlbSource({ ...SAMPLE_OPTIONS, loadBattedBalls: undefined })
    const d = await noBalls.load()
    expect(d.meta.available.battedBalls).toBe(false)
    expect(await noBalls.loadBattedBalls(d.hitters[0].id)).toEqual([])
  })
})
