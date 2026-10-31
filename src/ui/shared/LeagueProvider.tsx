import { useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_LEAGUE, getDataSource } from '../../data/registry'
import type { LeagueId } from '../../data/types'
import { buildLeague } from '../../domain/league'
import { LeagueContext, type LeagueState } from './LeagueContext'

/** 데이터 출처에서 시즌 기록을 불러와 지표를 계산한 리그를 하위 화면에 넘긴다 */
export default function LeagueProvider({ league = DEFAULT_LEAGUE, children }: { league?: LeagueId; children: ReactNode }) {
  const [state, setState] = useState<LeagueState>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    getDataSource(league)
      .load()
      .then(
        (ds) => alive && setState({ status: 'ready', league: buildLeague(ds) }),
        (e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
      )
    return () => {
      alive = false
    }
  }, [league])

  return <LeagueContext.Provider value={state}>{children}</LeagueContext.Provider>
}
