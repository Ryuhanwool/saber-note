import { createContext, useContext } from 'react'
import type { MarketRepository } from '../../data/source'
import type { CommunityUser, MarketSnapshot } from '../../data/types'

export type MarketState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; repo: MarketRepository; user: CommunityUser | null; snapshot: MarketSnapshot }

export const MarketContext = createContext<MarketState>({ status: 'loading' })

export const useMarket = () => useContext(MarketContext)
