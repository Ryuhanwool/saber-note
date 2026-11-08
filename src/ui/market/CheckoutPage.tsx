import { useState } from 'react'
import { useNavigate } from 'react-router'
import { demoOrderNumber, summarizeCart, type CartSummary } from '../../domain/market/cart'
import { won } from '../../domain/market/catalog'
import { DemoPaymentNotice, Totals } from './CartPage'
import { useMarket } from './MarketContext'
import { useRequireLogin } from '../auth/login'
import { useCatalog } from './hooks'
import { MarketNav, MarketStatus } from './shared'
import './market.css'

/** 주문 묶음: 공식 스토어 / 판매자별 */
function Groups({ summary }: { summary: CartSummary }) {
  return (
    <>
      {summary.groups.map((g) => (
        <section key={g.key} className="ogroup" aria-label={g.key === 'store' ? '공식 스토어 주문' : `판매자 ${g.label} 주문`}>
          <h3>{g.key === 'store' ? '공식 스토어' : `판매자 · ${g.label}`}</h3>
          <ul>
            {g.items.map((i) => (
              <li key={i.key}><span>{i.name}{i.qty > 1 && ` × ${i.qty}`}</span><span>{won(i.unitPrice * i.qty)}</span></li>
            ))}
          </ul>
          <div className="osub">
            <span>상품 {won(g.subtotal)} + 배송비 {g.shipping ? won(g.shipping) : '무료'}</span>
            <b>{won(g.subtotal + g.shipping)}</b>
          </div>
          {g.key !== 'store' && <p className="muted" style={{ fontSize: '.8rem', margin: '4px 0 0' }}>판매자가 따로 보내요. 앱 밖에서 돈을 보내지 마세요.</p>}
        </section>
      ))}
    </>
  )
}

/** 화면 14. 주문 확인 (시연용): 공식 스토어와 판매자별로 나눠 보여 주고, 「주문하기」를 누르면 시연 주문 완료 */
export default function CheckoutPage() {
  const state = useMarket()
  const catalog = useCatalog()
  const navigate = useNavigate()
  const [done, setDone] = useState<{ number: string; summary: CartSummary } | null>(null)
  const requireLogin = useRequireLogin()
  if (state.status !== 'ready') return <MarketStatus />
  const { repo, user, snapshot } = state
  const summary = summarizeCart(snapshot.cart, catalog, snapshot.listings, user?.id ?? null)

  async function order() {
    if (!requireLogin(user)) return
    const number = demoOrderNumber(Date.now(), Math.random())
    await repo.saveCart([])
    setDone({ number, summary })
  }

  return (
    <div>
      <h1 className="display" style={{ fontSize: '1.8rem', margin: '0 0 8px' }}>굿즈 마켓</h1>
      <MarketNav />
      <DemoPaymentNotice />
      <div className="panel" style={{ marginTop: 12 }}>
        {done ? (
          <div role="status" aria-label="주문 완료">
            <h2 style={{ marginTop: 0 }}>주문을 접수했어요 (시연)</h2>
            <p>주문 번호 <b>{done.number}</b></p>
            <p className="muted">시연용이라 실제 결제와 배송은 일어나지 않아요. 장바구니를 비웠어요.</p>
            <Groups summary={done.summary} />
            <Totals summary={done.summary} />
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={() => navigate('/market')}>공식 스토어로</button>
              <button className="btn ghost" onClick={() => navigate('/market/fan')}>팬 마켓으로</button>
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>주문 확인</h2>
            {summary.groups.length ? (
              <>
                <Groups summary={summary} />
                <Totals summary={summary} />
                <div className="row" style={{ gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button className="btn ghost" onClick={() => navigate('/market/cart')}>장바구니로</button>
                  <button className="btn" onClick={() => void order()}>{won(summary.total)} 주문하기 (시연)</button>
                </div>
              </>
            ) : (
              <p className="empty">주문할 상품이 없어요. 장바구니를 확인해 주세요.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
