import { describe, expect, it } from 'vitest'
import { getDataSource } from '../data/registry'
import { comparePlayers, rowWinner } from './compare'
import { formatInnings, formatMetric } from './format'
import { buildLeague } from './league'

const league = buildLeague(await getDataSource('demo').load())
const [h1, h2] = league.pool.H
const [p1, p2] = league.pitchers

describe('선수 2명 비교', () => {
  it('타자와 투수, 같은 선수끼리는 비교하지 않는다', () => {
    expect(comparePlayers(h1, p1)).toEqual({ ok: false, reason: 'type-mismatch' })
    expect(comparePlayers(h1, h1)).toEqual({ ok: false, reason: 'same-player' })
  })

  it('타자는 8개, 투수는 6개 지표를 비교하고 우세 수를 센다', () => {
    const h = comparePlayers(h1, h2)
    const p = comparePlayers(p1, p2)
    if (!h.ok || !p.ok) throw new Error('비교 실패')
    expect(h.rows).toHaveLength(8)
    expect(p.rows).toHaveLength(6)
    expect(h.wins.a + h.wins.b).toBe(h.rows.filter((r) => r.winner).length)
    expect(h.leader).toBe(h.wins.a === h.wins.b ? null : h.wins.a > h.wins.b ? 'a' : 'b')
  })

  it('낮을수록 좋은 지표는 낮은 쪽이 앞선다', () => {
    expect(rowWinner('era', 3.1, 4.2)).toBe('a')
    expect(rowWinner('WAR', 3.1, 4.2)).toBe('b')
    expect(rowWinner('era', 3.1, 3.1)).toBeNull()
  })

  it('한쪽이라도 값이 없으면 그 지표는 우세를 가리지 않는다', () => {
    const dh = league.pool.H.find((p) => p.raw.pos === 'DH')!
    const ss = league.pool.H.find((p) => p.raw.pos === 'SS')!
    const r = comparePlayers(dh, ss)
    if (!r.ok) throw new Error('비교 실패')
    expect(r.rows.find((x) => x.key === 'drs')).toMatchObject({ a: null, winner: null })
  })
})

describe('표시 형식', () => {
  it('값 없음은 모두 -', () => {
    for (const v of [null, undefined, NaN]) expect(formatMetric('wrcp', v)).toBe('-')
  })

  it('지표 종류별 형식', () => {
    expect(formatMetric('ops', 0.8456)).toBe('.846')
    expect(formatMetric('ops', 1.0234)).toBe('1.023')
    expect(formatMetric('bbp', 0.1234)).toBe('12.3%')
    expect(formatMetric('drs', 7)).toBe('+7')
    expect(formatMetric('drs', -3)).toBe('-3')
    expect(formatMetric('spin', 2451.6)).toBe('2,452 rpm')
    expect(formatMetric('ev', 145.27)).toBe('145.3 km/h')
    expect(formatInnings(370)).toBe('123⅓이닝')
    expect(formatInnings(369)).toBe('123이닝')
  })
})
