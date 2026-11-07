import { useNavigate } from 'react-router'
import { DEMO_PAYMENT_NOTICE, MAX_QTY, removeLine, setQty, summarizeCart, type CartSummary } from '../../domain/market/cart'
import { won } from '../../domain/market/catalog'
import { listingPath, useCatalog } from './hooks'
import { useMarket } from './MarketContext'
import { GoodsImage, ListingPhoto, MarketNav, MarketStatus } from './shared'
import './market.css'

/** 시연 결제 안내 (장바구니와 주문 확인에 늘 보인다) */
export function DemoPaymentNotice() {
  return <p className="demopay" role="note">🧾 {DEMO_PAYMENT_NOTICE}</p>
}

/** 금액 합계 표 */
export function Totals({ summary }: { summary: CartSummary }) {
  return (
    <dl className="totals" aria-label="결제 금액">
      <dt>상품 금액</dt><dd>{won(summary.itemsTotal)}</dd>
      <dt>배송비</dt><dd>{won(summary.shippingTotal)}</dd>
      <dt><b>결제 예정 금액</b></dt><dd><b>{won(summary.total)}</b></dd>
    </dl>
  )
}

/** 화면 13. 장바구니: 공식 스토어 상품(수량 조절)과 팬 마켓 상품 */
export default function CartPage() {
  const state = useMarket()
  const catalog = useCatalog()
  const navigate = useNavigate()
  if (state.status !== 'ready') return <MarketStatus />
  const { repo, user, snapshot } = state
  const summary = summarizeCart(snapshot.cart, catalog, snapshot.listings, user?.id ?? null)
  const items = summary.groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })))

  return (
    <div>
      <h1 className="display" style={{ fontSize: '1.8rem', margin: '0 0 8px' }}>굿즈 마켓</h1>
      <MarketNav />
      <DemoPaymentNotice />
      <div className="panel" style={{ marginTop: 12 }}>
        <h2 style={{ marginTop: 0 }}>장바구니</h2>
        {!items.length && <p className="empty">장바구니가 비었어요. 공식 스토어나 팬 마켓에서 상품을 담아 보세요.</p>}
        <ul className="cart" aria-label="장바구니 상품">
          {items.map((i) => (
            <li key={i.key}>
              <div className="cthumb">
                {i.product ? <GoodsImage category={i.product.category} product={i.product} alt="" /> : i.listing && <ListingPhoto listing={i.listing} />}
              </div>
              <div className="cinfo">
                <span className="muted" style={{ fontSize: '.8rem' }}>{i.group}</span>
                {i.listing ? <a href={listingPath(i.listing.id)} onClick={(e) => { e.preventDefault(); navigate(listingPath(i.listing!.id)) }}><b>{i.name}</b></a> : <b>{i.name}</b>}
                <span>{won(i.unitPrice)}</span>
              </div>
              <div className="cqty">
                {i.line.kind === 'store' ? (
                  <>
                    <button className="chip small" aria-label={`${i.name} 하나 빼기`} onClick={() => void repo.saveCart(setQty(snapshot.cart, i.product!.id, i.qty - 1))}>−</button>
                    <span aria-label={`${i.name} 수량`}>{i.qty}</span>
                    <button className="chip small" aria-label={`${i.name} 하나 더`} disabled={i.qty >= MAX_QTY} onClick={() => void repo.saveCart(setQty(snapshot.cart, i.product!.id, i.qty + 1))}>+</button>
                  </>
                ) : <span className="muted">1개</span>}
                <button className="linkbtn" aria-label={`${i.name} 빼기`} onClick={() => void repo.saveCart(removeLine(snapshot.cart, i.line))}>빼기</button>
              </div>
            </li>
          ))}
        </ul>
        {items.length > 0 && (
          <>
            <Totals summary={summary} />
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn" onClick={() => navigate('/market/checkout')}>주문 확인으로</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
