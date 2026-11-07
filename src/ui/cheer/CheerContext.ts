import { createContext, useContext } from 'react'
import type { CheerRepository } from '../../data/source'
import type { CheerSnapshot, CommunityUser } from '../../data/types'

export type CheerState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; repo: CheerRepository; user: CommunityUser | null; snapshot: CheerSnapshot }

export const CheerContext = createContext<CheerState>({ status: 'loading' })

export const useCheer = () => useContext(CheerContext)
