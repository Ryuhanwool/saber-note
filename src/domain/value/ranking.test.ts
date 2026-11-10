import { describe, expect, it } from 'vitest'
import { DEMO_BASE_DATE } from '../../data/demo/season'
import { getDataSource } from '../../data/registry'
import type { RawDataset } from '../../data/types'
import { dayKeyKST, formatDayKey, shiftDayKey } from '../games/calendar'
import { buildLeague } from '../league'
import { adjustedValue, hitterStatsOf, setStat } from './adjust'
import {
  changeDirection, compareEntries, movers, rankChangeLabel, rankPlayers, rankingTeams, valueChangeLabel, valueRanking,
} from './ranking'
import { formatWon, playerValue } from './value'

const source = getDataSource('demo')
const leagueAt = async (d: string) => buildLeague(await source.loadDay!(d))
const TODAY = '2026-11-12'
const today = await leagueAt(TODAY)
const yesterday = await leagueAt(shiftDayKey(TODAY, -1))

describe('선수 가치 순위 (domain)', () => {
  it('같은 날짜는 항상 같은 순위다', async () => {
    for (const d of [DEMO_BASE_DATE, TODAY, '2027-04-01']) {
      const a = rankPlayers(await leagueAt(d)), b = rankPlayers(await leagueAt(d))
      expect(b.map((r) => [r.player.id, r.rank, r.value.total])).toEqual(a.map((r) => [r.player.id, r.rank, r.value.total]))
    }
  })

  it('순위는 예상 가치(기존 공식) 높은 순이고 1부터 빈틈없이 매긴다', () => {
    const rows = rankPlayers(today)
    expect(rows.map((r) => r.rank)).toEqual(rows.map((_, i) => i + 1))
    for (const r of rows) expect(r.value).toEqual(playerValue(today, r.player))
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].value.total).toBeGreaterThanOrEqual(rows[i].value.total)
  })

  it('동점 처리: 가치가 같으면 WAR 높은 쪽, 그것도 같으면 이름순', () => {
    expect(compareEntries({ total: 5e8, war: 3.2, name: '나' }, { total: 5e8, war: 3.3, name: '가' })).toBeGreaterThan(0)
    expect(compareEntries({ total: 5e8, war: 3.2, name: '나' }, { total: 5e8, war: 3.2, name: '가' })).toBeGreaterThan(0)
    expect(compareEntries({ total: 5e8, war: 3.2, name: '가' }, { total: 5e8, war: 3.2, name: '나' })).toBeLessThan(0)
    expect(compareEntries({ total: 6e8, war: 1, name: '하' }, { total: 5e8, war: 9, name: '가' })).toBeLessThan(0)
    // 실제 순위표에서도: 같은 금액끼리는 WAR가 내려가는 순서 (최저 3,000만 원 구간 포함)
    const rows = rankPlayers(today)
    let ties = 0
    for (let i = 1; i < rows.length; i++) {
      if (rows[i - 1].value.total !== rows[i].value.total) continue
      ties++
      const [a, b] = [rows[i - 1].player, rows[i].player]
      expect(a.m.WAR > b.m.WAR || (a.m.WAR === b.m.WAR && a.name.localeCompare(b.name, 'ko') <= 0), `${a.name} / ${b.name}`).toBe(true)
    }
    expect(ties).toBeGreaterThan(0)
  })

  it('순위 변화·금액 변화 = 어제 순위표와의 차이', () => {
    const rows = valueRanking(today, yesterday)
    const prev = new Map(rankPlayers(yesterday).map((r) => [r.player.id, r]))
    for (const r of rows) {
      const p = prev.get(r.player.id)!
      expect(r.prev).toEqual({ rank: p.rank, total: p.value.total })
      expect(r.rankChange).toBe(p.rank - r.rank)
      expect(r.valueChange).toBe(r.value.total - p.value.total)
    }
    expect(rows.some((r) => r.rankChange! > 0) && rows.some((r) => r.rankChange! < 0)).toBe(true)
  })

  it('어제 순위표에 없던 선수는 NEW (순위·금액 변화 없음)', async () => {
    const ds: RawDataset = structuredClone(await source.loadDay!(shiftDayKey(TODAY, -1)))
    const newcomer = ds.hitters[3].id
    ds.hitters.splice(3, 1)
    const rows = valueRanking(today, buildLeague(ds))
    const r = rows.find((x) => x.player.id === newcomer)!
    expect(r.prev).toBeNull()
    expect(r.rankChange).toBeNull()
    expect(r.valueChange).toBeNull()
    expect(rankChangeLabel(r)).toBe('NEW')
    expect(valueChangeLabel(r.valueChange)).toBe('NEW')
    expect(changeDirection(r.rankChange)).toBe('new')
    // 출처가 날짜별 기록을 주지 않으면 모두 새로 진입
    expect(valueRanking(today, null).every((x) => x.rankChange === null)).toBe(true)
  })

  it('표시: ▲3, ▼2, 변동 없음 –, 금액 +1,000만 원 / −3,000만 원 / +1.2억', () => {
    expect(rankChangeLabel({ rankChange: 3 })).toBe('▲3')
    expect(rankChangeLabel({ rankChange: -2 })).toBe('▼2')
    expect(rankChangeLabel({ rankChange: 0 })).toBe('–')
    expect(valueChangeLabel(12_000_000)).toBe('+1,200만 원')
    expect(valueChangeLabel(-30_000_000)).toBe('−3,000만 원')
    expect(valueChangeLabel(120_000_000)).toBe('+1.2억')
    expect(valueChangeLabel(0)).toBe('–')
  })

  it('필터: 타자·투수·팀 안에서 다시 순위를 매기고, 어제도 같은 필터로 비교한다', () => {
    const team = rankingTeams(today)[2]
    for (const f of [{ group: 'H' as const, team: null }, { group: 'P' as const, team: null }, { group: 'all' as const, team }, { group: 'P' as const, team }]) {
      const rows = valueRanking(today, yesterday, f)
      expect(rows.length).toBeGreaterThan(0)
      expect(rows.map((r) => r.rank)).toEqual(rows.map((_, i) => i + 1))
      for (const r of rows) {
        if (f.group !== 'all') expect(r.player.type).toBe(f.group)
        if (f.team) expect(r.player.team).toBe(f.team)
      }
      const prev = new Map(rankPlayers(yesterday, f).map((r) => [r.player.id, r.rank]))
      for (const r of rows) expect(r.rankChange).toBe(prev.get(r.player.id)! - r.rank)
    }
    expect(rankingTeams(today)).toHaveLength(6)
  })

  it('급상승·급하락 3명: 금액 변화가 가장 큰 선수 (오른 쪽은 +, 내린 쪽은 −만)', () => {
    const rows = valueRanking(today, yesterday)
    const { up, down } = movers(rows)
    expect(up.length).toBeLessThanOrEqual(3)
    expect(down.length).toBeLessThanOrEqual(3)
    for (const r of up) expect(r.valueChange!).toBeGreaterThan(0)
    for (const r of down) expect(r.valueChange!).toBeLessThan(0)
    const maxUp = Math.max(...rows.map((r) => r.valueChange!))
    if (maxUp > 0) expect(up[0].valueChange).toBe(maxUp)
    const maxDown = Math.min(...rows.map((r) => r.valueChange!))
    if (maxDown < 0) expect(down[0].valueChange).toBe(maxDown)
  })

  it('최저 3,000만 원 규칙이 순위표에서도 지켜진다', async () => {
    for (const d of [TODAY, '2026-06-01', '2027-08-15']) {
      const rows = valueRanking(await leagueAt(d), await leagueAt(shiftDayKey(d, -1)))
      for (const r of rows) {
        expect(r.value.total).toBeGreaterThanOrEqual(30_000_000)
        if (r.value.floorApplied) expect(r.value.total).toBe(30_000_000)
      }
      // 최저 금액이 걸린 선수들은 3,000만 원으로 맨 아래 금액대에 있다 (합계가 딱 3,000만 원인 선수와는 WAR 순서로 섞일 수 있다)
      const floored = rows.filter((r) => r.value.floorApplied)
      for (const r of floored) expect(formatWon(r.value.total)).toBe('3,000만 원')
      if (floored.length) expect(rows.slice(rows.indexOf(floored[0])).every((r) => r.value.total === 30_000_000)).toBe(true)
    }
  })

  it('스탯 조절 값은 순위에 들어가지 않는다 (순위는 리그 기록만으로 계산)', () => {
    const before = rankPlayers(today)
    const p = today.hitters[0]
    // 화면에서 스탯을 바꿔 계산해 봐도 리그 기록과 순위는 그대로다
    const s = setStat(p, hitterStatsOf(p.raw), 'HR', p.raw.HR + 40)
    expect(adjustedValue(today, p, s, 3).value.total).toBeGreaterThan(playerValue(today, p).total)
    expect(rankPlayers(today)).toEqual(before)
    expect(rankPlayers(today).find((r) => r.player.id === p.id)!.value).toEqual(playerValue(today, p))
  })

  it('한국 시간 0시를 기준으로 날짜가 바뀐다 (어제·오늘 날짜 계산 포함)', () => {
    expect(dayKeyKST(new Date('2026-11-11T14:59:59.999Z'))).toBe('2026-11-11')
    expect(dayKeyKST(new Date('2026-11-11T15:00:00Z'))).toBe('2026-11-12')
    expect(shiftDayKey('2026-11-12', -1)).toBe('2026-11-11')
    expect(shiftDayKey('2027-01-01', -1)).toBe('2026-12-31')
    expect(shiftDayKey('2028-02-28', 1)).toBe('2028-02-29')
    expect(formatDayKey('2026-11-10')).toBe('2026.11.10')
  })
})
