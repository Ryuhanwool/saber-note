import { describe, expect, it } from 'vitest'
import golden from '../../fixtures/demo-golden.json'
import { getDataSource } from '../data/registry'
import { formatMetric } from './format'
import { buildLeague } from './league'
import { leagueAverage, meanOfPresent, percentile, percentileOf } from './percentile'

describe('값 없음(null·undefined·NaN)은 리그 평균과 백분위에서 빠진다', () => {
  it('평균은 값 있는 숫자만으로 낸다', () => {
    expect(meanOfPresent([1, null, undefined, 3, NaN])).toBe(2)
    expect(meanOfPresent([null, undefined])).toBeNull()
    expect(meanOfPresent([])).toBeNull()
  })

  it('백분위의 분모에 값 없음을 넣지 않는다', () => {
    const withMissing = percentileOf(3, [1, 2, 3, null, undefined, 4, NaN], 'higher')
    expect(withMissing).toBe(percentileOf(3, [1, 2, 3, 4], 'higher'))
    expect(withMissing).toBe(63) // (작은 값 2개 + 같은 값 1개의 절반) / 4 = 62.5%
  })

  it('자기 값이 없거나 좋고 나쁨이 없는 지표는 백분위가 없다', () => {
    expect(percentileOf(null, [1, 2, 3], 'higher')).toBeNull()
    expect(percentileOf(undefined, [1, 2, 3], 'higher')).toBeNull()
    expect(percentileOf(2, [1, 2, 3], null)).toBeNull()
    expect(percentileOf(2, [null, undefined], 'higher')).toBeNull()
  })

  describe('데모 리그: 지명타자가 섞인 수비율', async () => {
    const league = buildLeague(await getDataSource('demo').load())
    const dhs = league.pool.H.filter((p) => p.raw.pos === 'DH')
    const fielders = league.pool.H.filter((p) => p.raw.pos !== 'DH')

    it('지명타자는 수비율·레인지 팩터가 null이고 백분위도 없다', () => {
      expect(dhs.length).toBeGreaterThan(0)
      for (const dh of dhs) {
        expect(dh.m.fpct).toBeNull()
        expect(dh.m.rf9).toBeNull()
        expect(percentile(league, dh, 'fpct')).toBeNull()
        expect(formatMetric('fpct', dh.m.fpct)).toBe('-')
      }
    })

    it('리그 평균 수비율은 NaN이 아니라 수비수만의 평균이다 (데모는 NaN)', () => {
      expect(golden.demoQuirks.lgAvgNaN.H).toContain('fpct')
      const avg = leagueAverage(league, 'H', 'fpct')
      expect(avg).not.toBeNull()
      expect(Number.isNaN(avg)).toBe(false)
      expect(avg).toBe(fielders.reduce((a, p) => a + p.m.fpct!, 0) / fielders.length)
    })

    it('수비율 백분위는 수비수끼리만 센다', () => {
      const values = fielders.map((p) => p.m.fpct)
      for (const p of fielders) expect(percentile(league, p, 'fpct')).toBe(percentileOf(p.m.fpct, values, 'higher'))
    })
  })
})
