import { useEffect, useState } from 'react'
import { shiftDayKey } from '../../domain/games/calendar'
import { buildLeague } from '../../domain/league'
import type { League } from '../../domain/players'
import { useDataSource } from '../shared/LeagueContext'

/** 어제(보는 날짜 하루 전) 기록. 날짜별 기록이 없는 출처면 null */
export function useYesterday(date: string | null): { league: League | null; ready: boolean } {
  const source = useDataSource()
  const [got, setGot] = useState<{ date: string | null; league: League | null } | null>(null)
  useEffect(() => {
    if (!date || !source.loadDay) return
    let alive = true
    source.loadDay(shiftDayKey(date, -1)).then((ds) => alive && setGot({ date, league: buildLeague(ds) }))
    return () => {
      alive = false
    }
  }, [source, date])
  if (!date || !source.loadDay) return { league: null, ready: true }
  return got?.date === date ? { league: got.league, ready: true } : { league: null, ready: false }
}
