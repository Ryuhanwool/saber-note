import { describe, expect, it } from 'vitest'
import { getDataSource } from '../data/registry'
import { buildLeague } from './league'
import { searchPlayers, topByWar } from './search'

const league = buildLeague(await getDataSource('demo').load())

describe('선수 검색', () => {
  it('이름 일부로 찾는다', () => {
    const target = league.hitters[5]
    const hits = searchPlayers(league, target.name.slice(1))
    expect(hits).toContain(target)
    expect(hits.every((p) => p.name.includes(target.name.slice(1)) || p.team.includes(target.name.slice(1)))).toBe(true)
  })

  it('팀 이름으로도 찾고, 최대 개수를 넘지 않는다', () => {
    const hits = searchPlayers(league, '수달스')
    expect(hits).toHaveLength(8)
    expect(hits.every((p) => p.team === '한빛 수달스')).toBe(true)
  })

  it('빈 검색어나 맞는 선수가 없으면 빈 목록', () => {
    expect(searchPlayers(league, '   ')).toEqual([])
    expect(searchPlayers(league, '없는선수이름')).toEqual([])
  })

  it('WAR 상위는 내림차순이고 원래 배열을 바꾸지 않는다', () => {
    const before = league.hitters.map((p) => p.id)
    const top = topByWar(league.hitters, 5)
    expect(top).toHaveLength(5)
    for (let i = 1; i < top.length; i++) expect(top[i - 1].m.WAR).toBeGreaterThanOrEqual(top[i].m.WAR)
    expect(league.hitters.map((p) => p.id)).toEqual(before)
  })
})
