import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import type { GoodsCategory, MarketListing } from '../../data/types'
import { goodsSvg, svgDataUrl } from '../../domain/market/art'
import { CATEGORIES, type StoreProduct } from '../../domain/market/catalog'
import { useMarket } from './MarketContext'

/** 상품 그림 (코드로 그린 SVG) */
export function GoodsImage({ category, product, alt }: { category: GoodsCategory; product?: StoreProduct; alt: string }) {
  const src = svgDataUrl(goodsSvg(category, product?.colors ?? null, product?.mark ?? ''))
  return <img className="gimg" src={src} alt={alt} />
}

/** 판매글 대표 사진: 첫 사진, 없으면 상품 종류 그림 */
export function ListingPhoto({ listing, index = 0 }: { listing: MarketListing; index?: number }) {
  const state = useMarket()
  const media = listing.media[index]
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (state.status !== 'ready' || !media) return
    let alive = true
    state.repo.mediaUrl(media).then((u) => alive && setUrl(u), () => {})
    return () => {
      alive = false
    }
  }, [state, media])
  if (!media || !url) {
    return (
      <div className="gph">
        <GoodsImage category={listing.category} alt={`${CATEGORIES[listing.category].label} 그림`} />
        {!media && <span>사진 없음</span>}
      </div>
    )
  }
  return <img className="gimg" src={url} alt={`${listing.title} 사진 ${index + 1}`} />
}

/** 마켓 위쪽 메뉴: 공식 스토어 · 팬 마켓 · 장바구니(개수) */
export function MarketNav() {
  const { pathname } = useLocation()
  const state = useMarket()
  const count = state.status === 'ready' ? state.snapshot.cart.reduce((n, l) => n + (l.kind === 'store' ? l.qty : 1), 0) : 0
  const tabs = [
    { to: '/market', label: '공식 스토어', on: pathname === '/market' },
    { to: '/market/fan', label: '팬 마켓', on: pathname.startsWith('/market/fan') || pathname === '/market/sell' },
    { to: '/market/cart', label: `장바구니 ${count}`, on: pathname === '/market/cart' || pathname === '/market/checkout' },
  ]
  return (
    <nav className="mnav" aria-label="마켓 메뉴">
      {tabs.map((t) => (
        <Link key={t.to} to={t.to} className="chip" aria-current={t.on ? 'page' : undefined}>{t.label}</Link>
      ))}
    </nav>
  )
}

/** 마켓을 열지 못했거나 불러오는 중일 때 */
export function MarketStatus() {
  const state = useMarket()
  if (state.status === 'loading') return <p className="empty">마켓을 불러오는 중이에요.</p>
  if (state.status === 'error') {
    return (
      <div className="panel" role="alert">
        <h2>마켓을 열지 못했어요</h2>
        <p className="muted">{state.message}</p>
      </div>
    )
  }
  return null
}
