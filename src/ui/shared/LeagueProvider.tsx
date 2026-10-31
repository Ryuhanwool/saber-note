import { useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_LEAGUE, getDataSource } from '../../data/registry'
import type { LeagueDataSource } from '../../data/source'
import type { LeagueId } from '../../data/types'
import { buildLeague } from '../../domain/league'
import { LeagueContext, type LeagueState } from './LeagueContext'

type Props = {
  league?: LeagueId
  /** registry 대신 쓸 데이터 출처 (테스트·화면 검증용). 주면 league는 무시한다 */
  source?: LeagueDataSource
  children: ReactNode
}

/** 데이터 출처에서 시즌 기록을 불러와 지표를 계산한 리그를 하위 화면에 넘긴다 */
export default function LeagueProvider({ league = DEFAULT_LEAGUE, source, children }: Props) {
  const [state, setState] = useState<LeagueState>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    const src = source ?? getDataSource(league)
    src
      .load()
      .then(
        (ds) => alive && setState({ status: 'ready', league: buildLeague(ds), source: src }),
        (e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
      )
    return () => {
      alive = false
    }
  }, [league, source])

  return <LeagueContext.Provider value={state}>{children}</LeagueContext.Provider>
}
