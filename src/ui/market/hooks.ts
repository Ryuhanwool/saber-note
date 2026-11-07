import { useMemo } from 'react'
import type { CartLine, PlayerId } from '../../data/types'
import { addToCart } from '../../domain/market/cart'
import { storeCatalog, teamsOf, type StoreProduct } from '../../domain/market/catalog'
import { useLeague } from '../shared/LeagueContext'
import { useMarket } from './MarketContext'

export const listingPath = (id: string) => `/market/fan/${encodeURIComponent(id)}`
export const sellPath = (player?: PlayerId) => (player ? `/market/sell?${new URLSearchParams({ player })}` : '/market/sell')

/** 공식 스토어 상품 목록 (리그의 가상 구단으로 만든다) */
export function useCatalog(): StoreProduct[] {
  const league = useLeague()
  return useMemo(() => storeCatalog(teamsOf([...league.hitters, ...league.pitchers])), [league])
}

/** 장바구니에 담기 */
export function useAddToCart() {
  const state = useMarket()
  return async (line: CartLine) => {
    if (state.status !== 'ready') return
    await state.repo.saveCart(addToCart(state.snapshot.cart, line))
  }
}
