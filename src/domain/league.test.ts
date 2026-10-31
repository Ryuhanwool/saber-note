import { describe, expect, it } from 'vitest'
import golden from '../../fixtures/demo-golden.json'
import { getDataSource } from '../data/registry'
import { CATALOG, type MetricKey } from './catalog'
import { formatMetric } from './format'
import { buildLeague } from './league'
import { leagueAverage, metricValue, percentile } from './percentile'

type GoldenPlayer = Record<string, unknown> & { id: number }

const league = buildLeague(await getDataSource('demo').load())
const goldenById = new Map((golden.players as GoldenPlayer[]).map((p) => [`demo:${p.id}`, p]))
const goldenMetrics = golden.metrics as Record<string, Record<string, { fmt: string; pctl: number | null }>>

// 골든 필드 이름 → 새 지표 이름 (같으면 생략)
const RENAMED: Record<string, string> = { raw: 'fipCore' }
// 데모 버그로 골든 값이 틀린 항목: 지명타자의 fpct가 undefined인데 데모 pctl이 분모에 넣었다.
// 새 계산이 값 있는 선수만 세는지는 percentile.test.ts에서 따로 확인한다.
const GOLDEN_PCTL_WRONG = new Set(['fpct'])
// 데모와 일부러 다른 표시: 반올림해서 0인 값에 데모는 부호를 붙였다("-0.0", "+0.0"). 새 앱은 "0.0"
const SIGNED_ZERO = new Set(golden.demoQuirks.signedZeroFmt.map((q) => `demo:${q.id} ${q.key}`))

/** === 비교 (0과 -0은 같게 본다. JSON 저장 시 -0이 0이 되기 때문) */
const same = (a: unknown, b: unknown) => a === b

describe('domain: 데모와 같은 지표 계산', () => {
  it('리그 기준값이 같다', () => {
    const LG = golden.league
    expect(league.totals.woba).toBe(LG.woba)
    expect(league.totals.wsbPerOnFirst).toBe(LG.wsb)
    expect(league.totals.xbt).toBe(LG.xbt)
    expect(league.totals.era).toBe(LG.era)
    expect(league.totals.cfip).toBe(LG.cfip)
  })

  it('비교 대상(300타석 이상 타자, 투수 전원)이 같다', () => {
    expect(league.pool.H.map((p) => p.id)).toEqual(golden.pools.H.map((n) => `demo:${n}`))
    expect(league.pool.P.map((p) => p.id)).toEqual(golden.pools.P.map((n) => `demo:${n}`))
  })

  it('선수별 계산값이 데모와 정확히 같다', () => {
    const mismatches: string[] = []
    for (const p of [...league.hitters, ...league.pitchers]) {
      const want = goldenById.get(p.id)!
      for (const [k, v] of Object.entries(p.m)) {
        const gk = Object.entries(RENAMED).find(([, to]) => to === k)?.[0] ?? k
        if (!(gk in want)) {
          // 골든에 없는 값은 데모가 undefined로 둔 것: 새 계산은 null이어야 한다
          if (v !== null) mismatches.push(`${p.id} ${k}: 골든 없음, 새 값 ${v}`)
          continue
        }
        if (!same(v, want[gk] ?? null)) mismatches.push(`${p.id} ${k}: ${want[gk]} → ${v}`)
      }
    }
    expect(mismatches).toEqual([])
  })

  it('표시 문자열과 백분위가 데모와 같다', () => {
    const mismatches: string[] = []
    for (const p of [...league.hitters, ...league.pitchers]) {
      for (const [k, want] of Object.entries(goldenMetrics[p.id.split(':')[1]])) {
        const key = k as MetricKey
        const fmt = formatMetric(key, metricValue(p, key))
        // 부호 붙은 0은 데모 표시에서 부호만 뗀 값이어야 한다
        const expected = SIGNED_ZERO.has(`${p.id} ${k}`) ? want.fmt.slice(1) : want.fmt
        if (fmt !== expected) mismatches.push(`${p.id} ${k} 표시: ${want.fmt} → ${fmt}`)
        if (GOLDEN_PCTL_WRONG.has(k)) continue
        const pc = percentile(league, p, key)
        if (pc !== want.pctl) mismatches.push(`${p.id} ${k} 백분위: ${want.pctl} → ${pc}`)
      }
    }
    expect(mismatches).toEqual([])
  })

  it('데모의 부호 붙은 0 표시(-0.0, +0.0)가 실제로 있었고, 새 표시에는 없다', () => {
    const keys = golden.demoQuirks.signedZeroFmt
    expect(keys.some((q) => q.fmt.startsWith('-'))).toBe(true)
    expect(keys.some((q) => q.fmt.startsWith('+'))).toBe(true)
    for (const q of keys) {
      const p = league.byId.get(`demo:${q.id}`)!
      expect(formatMetric(q.key as MetricKey, metricValue(p, q.key as MetricKey)), `${p.id} ${q.key}`).toMatch(/^0\.0+$/)
    }
  })

  it('리그 평균이 데모와 같다', () => {
    for (const type of ['H', 'P'] as const) {
      for (const [k, want] of Object.entries(golden.lgAvg[type])) {
        expect(leagueAverage(league, type, k as MetricKey), `${type} ${k}`).toBe(want)
      }
    }
  })

  it('카탈로그의 모든 지표가 타자나 투수 지표로 계산된다', () => {
    const h = league.hitters[0], p = league.pitchers[0]
    for (const k of Object.keys(CATALOG)) expect(k in h.m || k in p.m, k).toBe(true)
  })
})
