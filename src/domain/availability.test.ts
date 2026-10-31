import { describe, expect, it } from 'vitest'
import { createMlbSource } from '../data/mlb'
import { SAMPLE_OPTIONS } from '../data/mlb/sample'
import { getDataSource } from '../data/registry'
import { availableKeys, metricAvailable } from './availability'
import { CATALOG, type MetricKey } from './catalog'
import { comparePlayers } from './compare'
import { defenseTabAvailable, ratingWord, traditionalFielding } from './defense'
import { formatMetric } from './format'
import { buildLeague } from './league'
import type { HitterPlayer } from './players'

const demo = buildLeague(await getDataSource('demo').load())
const mlb = buildLeague(await createMlbSource(SAMPLE_OPTIONS).load())
const ALL_KEYS = Object.keys(CATALOG) as MetricKey[]

describe('지표별 있음/없음', () => {
  it('demo는 모든 지표가 있다', () => {
    expect(availableKeys(demo, ALL_KEYS)).toEqual(ALL_KEYS)
    expect(defenseTabAvailable(demo)).toBe(true)
  })

  it('MLB는 OAA·타구 속도·스프린트 스피드가 있고 DRS·UZR·ZR·구성 요소·수비율·추가 진루율이 없다', () => {
    for (const k of ['oaa', 'ev', 'maxev', 'hard', 'barrel', 'xba', 'sprint', 'h2f', 'velo', 'spin', 'whiff'] as const) {
      expect(metricAvailable(mlb, k), k).toBe(true)
    }
    for (const k of ['drs', 'uzr', 'zr', 'rngR', 'errR', 'dpR', 'armR', 'frmR', 'blkR', 'csR', 'csp', 'fpct', 'xbt'] as const) {
      expect(metricAvailable(mlb, k), k).toBe(false)
    }
    // 기본 기록으로 계산하는 지표는 언제나 있다
    for (const k of ['WAR', 'wrcp', 'ops', 'bsr', 'sb', 'era', 'fip'] as const) expect(metricAvailable(mlb, k), k).toBe(true)
    expect(defenseTabAvailable(mlb)).toBe(true) // OAA가 있으므로 수비 탭은 연다
  })

  it('MLB도 지표가 계산되고, 없는 기록은 null이다', () => {
    for (const p of mlb.hitters) {
      expect(Number.isFinite(p.m.WAR), p.name).toBe(true)
      expect(p.m.uzr).toBeNull()
      expect(p.m.fpct).toBeNull()
      expect(p.m.xbt).toBeNull()
      expect(p.m.bsr).toBe(p.m.wsb) // 추가 진루 기록이 없으면 도루 득점만
    }
  })
})

describe('수비 탭 계산', () => {
  const ofPos = (league: typeof demo, pos: string) => league.pool.H.find((p) => p.raw.pos === pos) as HitterPlayer

  it('demo 유격수는 전통 기록 5칸(병살 처리 포함), 포수는 도루 저지율, 외야수는 보살', () => {
    expect(traditionalFielding(demo, ofPos(demo, 'SS')).map((x) => x.label)).toEqual(['수비 이닝', '수비율', '실책', '레인지 팩터', '병살 처리'])
    expect(traditionalFielding(demo, ofPos(demo, 'C')).at(-1)!.label).toBe('도루 저지율')
    expect(traditionalFielding(demo, ofPos(demo, 'CF')).at(-1)!.label).toBe('보살')
    const ss = ofPos(demo, 'SS')
    expect(traditionalFielding(demo, ss)[1].value).toBe(formatMetric('fpct', ss.m.fpct))
  })

  it('MLB는 전통 기록이 없어 칸이 하나도 없다', () => {
    expect(traditionalFielding(mlb, ofPos(mlb, 'SS'))).toEqual([])
  })

  it('20~80 등급을 말로 바꾼다', () => {
    expect([80, 70, 60, 55, 50, 45, 40, 35].map(ratingWord)).toEqual(['최고 수준', '매우 뛰어남', '뛰어남', '평균 이상', '평균', '평균 이하', '약점', '큰 약점'])
  })
})

describe('비교에서 없는 지표 빼기', () => {
  it('MLB 타자 비교에는 DRS 줄이 없다 (8개 → 7개)', () => {
    const [a, b] = mlb.pool.H
    const r = comparePlayers(a, b, (k) => metricAvailable(mlb, k))
    if (!r.ok) throw new Error('비교 실패')
    expect(r.rows.map((x) => x.key)).not.toContain('drs')
    expect(r.rows).toHaveLength(7)
  })
})
