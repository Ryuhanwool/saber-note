import { describe, expect, it } from 'vitest'
import { DEMO_BASE_DATE, addDays } from '../../data/demo/season'
import { getDataSource } from '../../data/registry'
import { buildLeague } from '../league'
import { playerValue } from '../value/value'
import { candidates, emptyLineup, place, problems } from './lineup'
import { FAN_COUNT, virtualFanLineups } from './fans'
import { pickCounts, pickRanking } from './picks'
import { bullpenRoles } from './roles'
import { LINEUP_SLOTS } from './slots'

const source = getDataSource('demo')
const basis = buildLeague(await source.loadDay!(DEMO_BASE_DATE))
const roles = bullpenRoles(basis)
const fans = virtualFanLineups(basis, roles)
const today = buildLeague(await source.loadDay!(addDays(DEMO_BASE_DATE, 3)))

describe('가상 팬 라인업 (domain)', () => {
  it('300개, 모두 12자리를 규칙대로 채웠다', () => {
    expect(fans).toHaveLength(FAN_COUNT)
    for (const l of fans) {
      expect(LINEUP_SLOTS.every((s) => l.slots[s] !== null)).toBe(true)
      expect(problems(l, basis, roles)).toEqual([])
    }
  })

  it('같은 조건이면 늘 같은 결과다 (기준 리그를 새로 만들어도, 날짜를 옮겨도)', async () => {
    const again = buildLeague(await source.loadDay!(DEMO_BASE_DATE))
    expect(virtualFanLineups(again, bullpenRoles(again))).toEqual(fans)
    expect(virtualFanLineups(basis, roles)).toBe(fans) // 같은 리그는 한 번만 만든다
  })

  it('가치·인기를 반영하되 1위에만 몰리지 않는다: 자리마다 1위 60% 미만, 3명 이상이 픽을 받고, 픽률은 예상 가치와 함께 오른다', () => {
    const pc = pickCounts(fans, null)
    const pairs: [number, number][] = []
    for (const s of LINEUP_SLOTS) {
      const rows = pickRanking(s, pc, basis, roles, null)
      expect(rows[0].pct, s).toBeLessThan(60)
      expect(rows.filter((r) => r.count > 0).length, s).toBeGreaterThanOrEqual(3)
      if (s === 'DH') continue // 지명타자는 수비 자리에 이미 넣은 선수를 빼고 고른다
      for (const r of rows) pairs.push([playerValue(basis, r.player).total / 1e8, r.pct])
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const mx = mean(pairs.map((p) => p[0])), my = mean(pairs.map((p) => p[1]))
    const cov = pairs.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0)
    const corr = cov / Math.sqrt(pairs.reduce((a, [x]) => a + (x - mx) ** 2, 0) * pairs.reduce((a, [, y]) => a + (y - my) ** 2, 0))
    expect(corr).toBeGreaterThan(0.4) // 가치가 높을수록 더 많이 뽑힌다 (운·인기 때문에 1은 아니다)
    expect(corr).toBeLessThan(0.95)
    expect(candidates(basis, 'C', roles).length).toBeGreaterThan(0)
  })
})

describe('포지션별 픽 순위 (domain)', () => {
  it('픽 수 1~10위 (넣을 수 있는 선수가 적으면 있는 만큼), 픽률은 그 자리를 채운 라인업 수로 나눈다', () => {
    const pc = pickCounts(fans, null)
    for (const s of LINEUP_SLOTS) {
      const rows = pickRanking(s, pc, today, roles, null)
      expect(rows.length).toBe(Math.min(10, candidates(today, s, roles).length))
      for (let i = 1; i < rows.length; i++) expect(rows[i - 1].count).toBeGreaterThanOrEqual(rows[i].count)
      for (const r of rows) expect(r.pct).toBeCloseTo((r.count / 300) * 100, 10)
    }
    expect(pickRanking('MR', pc, today, roles, null)).toHaveLength(6)
    expect(pickRanking('CL', pc, today, roles, null)).toHaveLength(6)
  })

  it('픽 수가 같으면 같은 순위다', () => {
    const pc = pickCounts([], null)
    const rows = pickRanking('C', pc, today, roles, null)
    expect(rows.every((r) => r.rank === 1 && r.count === 0)).toBe(true)
  })

  it('내 라인업을 저장하면 그 선수 픽 수가 1 늘고, 바꾸면 이전 선수는 1 줄어든다', () => {
    const base = pickCounts(fans, null)
    const [a, b] = candidates(today, 'CL', roles)
    const r1 = place(emptyLineup(), 'CL', a, roles)
    if (!r1.ok) throw new Error()
    const withA = pickCounts(fans, r1.lineup)
    expect(withA.counts.CL.get(a.id)).toBe((base.counts.CL.get(a.id) ?? 0) + 1)
    expect(withA.voters.CL).toBe(301)
    expect(withA.voters.C).toBe(300) // 채우지 않은 자리는 분모도 그대로
    const r2 = place(r1.lineup, 'CL', b, roles)
    if (!r2.ok) throw new Error()
    const withB = pickCounts(fans, r2.lineup)
    expect(withB.counts.CL.get(a.id)).toBe(base.counts.CL.get(a.id) ?? 0)
    expect(withB.counts.CL.get(b.id)).toBe((base.counts.CL.get(b.id) ?? 0) + 1)
    const rows = pickRanking('CL', withB, today, roles, r2.lineup)
    expect(rows.filter((x) => x.mine).map((x) => x.player.id)).toEqual([b.id])
  })
})
