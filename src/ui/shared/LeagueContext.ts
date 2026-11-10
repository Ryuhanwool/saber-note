import { createContext, useContext } from 'react'
import type { LeagueDataSource } from '../../data/source'
import type { RawHitter, RawPitcher } from '../../data/types'
import type { BullpenRoles } from '../../domain/lineup/roles'
import type { League } from '../../domain/players'

/** 보고 있는 날짜 (날짜별 기록을 주는 출처만) */
export type LeagueDay = {
  /** 지금 보는 기록의 날짜 (한국 날짜 YYYY-MM-DD) */
  date: string
  /** 실제 오늘 (한국 시간 0시에 바뀐다) */
  today: string
  /** 시연용 날짜 이동 중이 아닌지 */
  isToday: boolean
  /** 시연용 날짜 이동. null이면 오늘로 */
  setDate(date: string | null): void
  /** 다른 날짜 기록을 불러오는 중 (그동안 지금 기록을 그대로 보여 준다) */
  pending: boolean
}

export type LeagueState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      league: League
      source: LeagueDataSource
      /** 날짜별 기록을 주는 출처면 날짜 정보, 아니면 null */
      day: LeagueDay | null
      /** 예시 글·응원·판매글을 만들 선수 명단: 처음 불러온 기록으로 고정 (날짜를 옮겨도 저장소를 다시 열지 않게) */
      roster: { hitters: RawHitter[]; pitchers: RawPitcher[] }
      /** 불펜 역할·가상 팬 라인업의 기준 리그 (meta.roleBasisDate 기록, 없으면 처음 불러온 기록). 날짜를 옮겨도 그대로 */
      basis: League
      /** 불펜 역할 (마무리·중간). basis로 한 번 정해 고정 */
      roles: BullpenRoles
    }

export const LeagueContext = createContext<LeagueState>({ status: 'loading' })

export const useLeagueState = () => useContext(LeagueContext)

/** 리그 데이터가 준비된 뒤에 그려지는 화면에서 쓴다 (Layout이 준비될 때까지 화면을 그리지 않는다) */
export function useLeague(): League {
  const state = useContext(LeagueContext)
  if (state.status !== 'ready') throw new Error('리그 데이터가 아직 준비되지 않았습니다.')
  return state.league
}

/** 리그를 불러온 데이터 출처 (타구 목록처럼 나중에 따로 불러오는 기록용) */
export function useDataSource(): LeagueDataSource {
  const state = useContext(LeagueContext)
  if (state.status !== 'ready') throw new Error('리그 데이터가 아직 준비되지 않았습니다.')
  return state.source
}

/** 보고 있는 날짜. 날짜별 기록이 없는 출처면 null */
export function useLeagueDay(): LeagueDay | null {
  const state = useContext(LeagueContext)
  return state.status === 'ready' ? state.day : null
}

/** 라인업 기준: 기준 리그와 불펜 역할 */
export function useLineupBasis(): { basis: League; roles: BullpenRoles } {
  const state = useContext(LeagueContext)
  if (state.status !== 'ready') throw new Error('리그 데이터가 아직 준비되지 않았습니다.')
  return { basis: state.basis, roles: state.roles }
}
