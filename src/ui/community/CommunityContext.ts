import { createContext, useContext } from 'react'
import type { CommunityRepository } from '../../data/source'
import type { CommunityPost, CommunityUser } from '../../data/types'

export type CommunityState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; repo: CommunityRepository; user: CommunityUser | null; posts: CommunityPost[] }

export const CommunityContext = createContext<CommunityState>({ status: 'loading' })

export const useCommunity = () => useContext(CommunityContext)
