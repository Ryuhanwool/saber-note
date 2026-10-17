import type { LeagueDataSource } from './source'
import type { LeagueId } from './types'
import { demoSource } from './demo'

// mlb(추가 1단계), kbo(데이터 확보 후)는 구현되면 여기에 등록한다.
const SOURCES: Partial<Record<LeagueId, LeagueDataSource>> = {
  demo: demoSource,
}

export const DEFAULT_LEAGUE: LeagueId = 'demo'

export function getDataSource(league: LeagueId = DEFAULT_LEAGUE): LeagueDataSource {
  const source = SOURCES[league]
  if (!source) throw new Error(`${league} 데이터 출처는 아직 구현되지 않았습니다.`)
  return source
}
