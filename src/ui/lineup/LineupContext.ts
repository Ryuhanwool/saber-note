import { createContext, useContext } from 'react'
import type { LineupRepository } from '../../data/source'
import type { CommunityUser, SavedLineup } from '../../data/types'

export type LineupState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; repo: LineupRepository; user: CommunityUser | null; mine: SavedLineup | null }

export const LineupContext = createContext<LineupState>({ status: 'loading' })

export const useLineupStore = () => useContext(LineupContext)
