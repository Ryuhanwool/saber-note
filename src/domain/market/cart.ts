// 장바구니와 주문 확인 (시연용: 실제 결제는 없다). 주문 확인은 공식 스토어와 판매자별로 나눈다.
import type { CartLine, MarketListing } from '../../data/types'
import { isHiddenByReports } from '../community/posts'
import type { StoreProduct } from './catalog'
import { sellerLabel } from './listing'

export const MAX_QTY = 10
/** 공식 스토어 배송비: 5만 원 이상이면 무료 */
export const STORE_SHIPPING = 3_000
export const FREE_SHIPPING_FROM = 50_000
/** 팬 마켓 판매자별 배송비 (택배 한 번) */
export const SELLER_SHIPPING = 3_500

export const DEMO_PAYMENT_NOTICE = '시연용이라 실제 결제는 일어나지 않아요'

export type CartItem = {
  line: CartLine
  key: string
  name: string
  unitPrice: number
  qty: number
  /** 공식 스토어 상품이면 그 상품, 판매글이면 그 판매글 */
  product: StoreProduct | null
  listing: MarketListing | null
}

export type CartGroup = {
  /** 'store' 또는 판매자 id */
  key: string
  /** "공식 스토어" 또는 판매자 이름 */
  label: string
  items: CartItem[]
  subtotal: number
  shipping: number
}

export type CartSummary = { groups: CartGroup[]; count: number; itemsTotal: number; shippingTotal: number; total: number }

const lineKey = (l: CartLine) => (l.kind === 'store' ? `store:${l.productId}` : `listing:${l.listingId}`)

/** 담기: 공식 스토어 상품은 수량을 더하고(최대 10개), 판매글은 한 번만 담긴다 */
export function addToCart(cart: readonly CartLine[], line: CartLine): CartLine[] {
  const key = lineKey(line)
  const existing = cart.find((l) => lineKey(l) === key)
  if (!existing) return [...cart, line.kind === 'store' ? { ...line, qty: Math.min(MAX_QTY, Math.max(1, line.qty)) } : line]
  if (existing.kind === 'listing' || line.kind === 'listing') return [...cart]
  return cart.map((l) => (l === existing ? { ...existing, qty: Math.min(MAX_QTY, existing.qty + line.qty) } : l))
}

/** 수량 바꾸기 (0 이하면 뺀다) */
export function setQty(cart: readonly CartLine[], productId: string, qty: number): CartLine[] {
  if (qty <= 0) return cart.filter((l) => !(l.kind === 'store' && l.productId === productId))
  return cart.map((l) => (l.kind === 'store' && l.productId === productId ? { ...l, qty: Math.min(MAX_QTY, qty) } : l))
}

export const removeLine = (cart: readonly CartLine[], line: CartLine): CartLine[] => cart.filter((l) => lineKey(l) !== lineKey(line))

export const inCart = (cart: readonly CartLine[], line: CartLine) => cart.some((l) => lineKey(l) === lineKey(line))

/** 담을 수 있는 판매글인지: 자기 판매글이나 신고로 가려진 판매글은 담을 수 없다 */
export const canBuyListing = (l: MarketListing, userId: string | null) => l.authorId !== userId && !isHiddenByReports(l)

/**
 * 장바구니 → 주문 확인 묶음. 없어진 상품·판매글, 살 수 없는 판매글은 뺀다.
 * 묶음 순서: 공식 스토어가 먼저, 판매자는 장바구니에 처음 담긴 순서.
 */
export function summarizeCart(
  cart: readonly CartLine[],
  products: readonly StoreProduct[],
  listings: readonly MarketListing[],
  userId: string | null,
): CartSummary {
  const groups = new Map<string, CartGroup>()
  const group = (key: string, label: string) => {
    if (!groups.has(key)) groups.set(key, { key, label, items: [], subtotal: 0, shipping: 0 })
    return groups.get(key)!
  }
  for (const line of cart) {
    if (line.kind === 'store') {
      const p = products.find((x) => x.id === line.productId)
      if (!p) continue
      group('store', '공식 스토어').items.push({ line, key: lineKey(line), name: p.name, unitPrice: p.price, qty: line.qty, product: p, listing: null })
    } else {
      const l = listings.find((x) => x.id === line.listingId)
      if (!l || !canBuyListing(l, userId)) continue
      group(l.authorId, sellerLabel(l)).items.push({ line, key: lineKey(line), name: l.title, unitPrice: l.price, qty: 1, product: null, listing: l })
    }
  }
  const ordered = [...groups.values()].sort((a, b) => (a.key === 'store' ? -1 : b.key === 'store' ? 1 : 0))
  for (const g of ordered) {
    g.subtotal = g.items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
    g.shipping = g.key === 'store' ? (g.subtotal >= FREE_SHIPPING_FROM ? 0 : STORE_SHIPPING) : SELLER_SHIPPING
  }
  const itemsTotal = ordered.reduce((s, g) => s + g.subtotal, 0)
  const shippingTotal = ordered.reduce((s, g) => s + g.shipping, 0)
  return {
    groups: ordered,
    count: ordered.reduce((s, g) => s + g.items.reduce((n, i) => n + i.qty, 0), 0),
    itemsTotal,
    shippingTotal,
    total: itemsTotal + shippingTotal,
  }
}

/** 시연용 주문 번호 (예: DEMO-20261107-4821) */
export function demoOrderNumber(now: number, rand: number): string {
  const d = new Date(now)
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `DEMO-${ymd}-${String(Math.floor(rand * 10_000)).padStart(4, '0')}`
}
