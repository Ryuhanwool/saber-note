import { createContext, useContext } from 'react'
import type { League } from '../../domain/players'

export type LeagueState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; league: League }

export const LeagueContext = createContext<LeagueState>({ status: 'loading' })

export const useLeagueState = () => useContext(LeagueContext)

/** 리그 데이터가 준비된 뒤에 그려지는 화면에서 쓴다 (Layout이 준비될 때까지 화면을 그리지 않는다) */
export function useLeague(): League {
  const state = useContext(LeagueContext)
  if (state.status !== 'ready') throw new Error('리그 데이터가 아직 준비되지 않았습니다.')
  return state.league
}
