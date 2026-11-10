import { describe, expect, it } from 'vitest'
import { getDataSource } from '../registry'
import type { RawDataset } from '../types'
import { allHolds, lateHolds } from './bullpen'
import { DEMO_BASE_DATE, addDays } from './season'

const source = getDataSource('demo')
const fnv = (s: string) => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

/**
 * 세이브·홀드를 넣기 전(main 258e977)의 데이터 지문. 타자 전체, 투수(세이브·홀드 빼고) JSON.
 * 리그 평균(wOBA·FIP 상수·ERA 등)은 이 기록으로만 계산하므로 기록이 같으면 리그 평균도 같다 (domain/lineup 테스트가 한 번 더 확인).
 */
const BEFORE: Record<string, [string, string]> = {
  '2026-11-10': ['8f726ce', 'fba951'],
  '2026-11-11': ['577f2200', '1463e0e7'],
  '2026-09-21': ['6dff5ce8', '87b507a0'],
  '2027-09-06': ['9cda5328', 'd7067300'],
}
const withoutSaves = (ds: RawDataset) => ds.pitchers.map(({ SV: _sv, HLD: _hld, ...rest }) => rest)

describe('불펜 세이브·홀드 (data)', () => {
  // 지문은 기준일 2026-11-10 데이터로 뜬 것이라, 기준일을 바꿔 보는 확인에서는 건너뛴다
  it.runIf(DEMO_BASE_DATE === '2026-11-10')('세이브·홀드를 넣어도 다른 기록은 바뀌지 않는다 (넣기 전 데이터 지문과 같다)', async () => {
    for (const [d, [h, p]] of Object.entries(BEFORE)) {
      const ds = await source.loadDay!(d)
      expect(fnv(JSON.stringify(ds.hitters)), `${d} 타자`).toBe(h)
      expect(fnv(JSON.stringify(withoutSaves(ds))), `${d} 투수`).toBe(p)
    }
  })

  it('불펜만 세이브·홀드가 있고, 세이브 ≤ 7회 이후 지킨 리드, 세이브 + 홀드 = 지킨 리드 (어느 날짜든)', async () => {
    for (const d of [DEMO_BASE_DATE, addDays(DEMO_BASE_DATE, 1), addDays(DEMO_BASE_DATE, -100), addDays(DEMO_BASE_DATE, 400)]) {
      const ds = await source.loadDay!(d)
      expect(ds.meta.available.saves).toBe(true)
      expect(ds.meta.roleBasisDate).toBe(DEMO_BASE_DATE)
      for (const p of ds.pitchers) {
        if (p.role === 'SP') {
          expect(p.SV).toBeNull()
          expect(p.HLD).toBeNull()
          continue
        }
        expect(p.SV!).toBeGreaterThanOrEqual(0)
        expect(p.SV!, `${d} ${p.name}`).toBeLessThanOrEqual(lateHolds(p.clutch!))
        expect(p.SV! + p.HLD!).toBe(allHolds(p.clutch!))
      }
    }
  })

  it('하루 변화: 세이브·홀드는 그날 경기에 따라 바뀌고, 같은 날짜는 늘 같다', async () => {
    const a = await source.loadDay!('2026-12-01'), b = await source.loadDay!('2026-12-01')
    expect(a.pitchers.map((p) => [p.SV, p.HLD])).toEqual(b.pitchers.map((p) => [p.SV, p.HLD]))
    const base = await source.loadDay!(DEMO_BASE_DATE)
    const far = await source.loadDay!(addDays(DEMO_BASE_DATE, 200))
    expect(far.pitchers.map((p) => p.SV)).not.toEqual(base.pitchers.map((p) => p.SV))
  })
})
