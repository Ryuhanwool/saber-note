import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_LEAGUE, getDataSource } from '../../data/registry'
import type { LeagueDataSource } from '../../data/source'
import type { LeagueId, RawHitter, RawPitcher } from '../../data/types'
import { dayKeyKST } from '../../domain/games/calendar'
import { buildLeague } from '../../domain/league'
import { bullpenRoles, type BullpenRoles } from '../../domain/lineup/roles'
import type { League } from '../../domain/players'
import { LeagueContext, type LeagueState } from './LeagueContext'

type Props = {
  league?: LeagueId
  /** registry 대신 쓸 데이터 출처 (테스트·화면 검증용). 주면 league는 무시한다 */
  source?: LeagueDataSource
  children: ReactNode
}

type Loaded = {
  league: League
  source: LeagueDataSource
  date: string | null
  /** 이 출처에서 처음 불러온 선수 명단 (날짜를 옮겨도 그대로) */
  roster: { hitters: RawHitter[]; pitchers: RawPitcher[] }
}

/** 한국 날짜가 바뀌었는지 1분마다 본다 (열어 둔 채 0시가 지나면 새 날짜 기록으로) */
function useTodayKST(): string {
  const [today, setToday] = useState(() => dayKeyKST(new Date()))
  useEffect(() => {
    const t = setInterval(() => setToday(dayKeyKST(new Date())), 60_000)
    return () => clearInterval(t)
  }, [])
  return today
}

/**
 * 데이터 출처에서 기록을 불러와 지표를 계산한 리그를 하위 화면에 넘긴다.
 * 날짜별 기록을 주는 출처(loadDay)는 오늘(한국 시간) 기록을 쓰고, 시연용 날짜 이동(setDate)을 받는다.
 */
export default function LeagueProvider({ league = DEFAULT_LEAGUE, source, children }: Props) {
  const src = useMemo(() => source ?? getDataSource(league), [league, source])
  const today = useTodayKST()
  // 시연용 날짜는 그 출처에서만 유효하다 (출처가 바뀌면 오늘로)
  const [moved, setMoved] = useState<{ src: LeagueDataSource; date: string } | null>(null)
  const viewDate = moved?.src === src ? moved.date : null
  const want = src.loadDay ? (viewDate ?? today) : null
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [failed, setFailed] = useState<{ src: LeagueDataSource; want: string | null; message: string } | null>(null)
  const error = failed?.src === src && failed.want === want ? failed.message : null
  // 불펜 역할·가상 팬 라인업의 기준 리그: 출처마다 한 번 (기준 날짜 기록, 없으면 처음 불러온 기록)
  const [basis, setBasis] = useState<{ src: LeagueDataSource; league: League; roles: BullpenRoles } | null>(null)
  const firstLeague = loaded?.source === src ? loaded.league : null
  const needBasis = firstLeague !== null && basis?.src !== src

  useEffect(() => {
    if (!needBasis || !firstLeague) return
    let alive = true
    const date = firstLeague.meta.roleBasisDate
    const load = date && src.loadDay && date !== firstLeague.meta.asOf
      ? src.loadDay(date).then(buildLeague)
      : Promise.resolve(firstLeague)
    load.then(
      (lg) => alive && setBasis({ src, league: lg, roles: bullpenRoles(lg) }),
      (e: unknown) => alive && setFailed({ src, want, message: e instanceof Error ? e.message : String(e) }),
    )
    return () => {
      alive = false
    }
  }, [needBasis, firstLeague, src, want])

  useEffect(() => {
    let alive = true
    ;(want && src.loadDay ? src.loadDay(want) : src.load()).then(
      (ds) => {
        if (!alive) return
        const lg = buildLeague(ds)
        setLoaded((prev) => ({
          league: lg, source: src, date: want,
          roster: prev?.source === src ? prev.roster : { hitters: ds.hitters, pitchers: ds.pitchers },
        }))
      },
      (e: unknown) => alive && setFailed({ src, want, message: e instanceof Error ? e.message : String(e) }),
    )
    return () => {
      alive = false
    }
  }, [src, want])

  const state: LeagueState = useMemo(() => {
    if (error) return { status: 'error', message: error }
    // 다른 출처의 기록이면 아직 불러오는 중. 같은 출처의 다른 날짜면 새 기록이 올 때까지 지금 기록을 보여 준다
    if (!loaded || loaded.source !== src || !basis || basis.src !== src) return { status: 'loading' }
    const date = loaded.date
    return {
      status: 'ready',
      league: loaded.league,
      source: loaded.source,
      roster: loaded.roster,
      basis: basis.league,
      roles: basis.roles,
      day: date === null ? null : {
        date, today, isToday: date === today, pending: date !== want,
        setDate: (d) => setMoved(d === null || d === today ? null : { src, date: d }),
      },
    }
  }, [error, loaded, basis, src, today, want])

  return <LeagueContext.Provider value={state}>{children}</LeagueContext.Provider>
}
