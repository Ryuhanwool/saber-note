import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { inCart } from '../../domain/market/cart'
import { won } from '../../domain/market/catalog'
import { useMarket } from './MarketContext'
import { useAddToCart, useCatalog } from './hooks'
import { GoodsImage, MarketNav, MarketStatus } from './shared'
import './market.css'

/** 화면 9. 공식 스토어: 가상 구단 6개의 상품, 구단별로 골라 보기 (?team=…) */
export default function StorePage() {
  const state = useMarket()
  const catalog = useCatalog()
  const add = useAddToCart()
  const [params, setParams] = useSearchParams()
  const [note, setNote] = useState<string | null>(null)
  const teams = [...new Set(catalog.map((p) => p.team))]
  const team = params.get('team')
  const shown = team && teams.includes(team) ? catalog.filter((p) => p.team === team) : catalog

  return (
    <div>
      <h1 className="display" style={{ fontSize: '1.8rem', margin: '0 0 8px' }}>굿즈 마켓</h1>
      <MarketNav />
      <MarketStatus />
      <p className="muted" style={{ fontSize: '.85rem' }}>
        앱 속 가상 구단의 가상 상품이에요. 상품 그림은 코드로 그린 그림이고, 실제 구단 디자인과 관계없어요.
      </p>
      <div className="filters" role="group" aria-label="구단 고르기">
        <button className="chip" aria-pressed={!team} onClick={() => setParams(new URLSearchParams())}>전체</button>
        {teams.map((t) => (
          <button key={t} className="chip" aria-pressed={team === t} onClick={() => setParams(new URLSearchParams({ team: t }))}>{t}</button>
        ))}
      </div>
      <p className="muted" role="status" style={{ fontSize: '.85rem', minHeight: '1.2em', margin: '0 0 8px' }}>{note}</p>
      <div className="ggrid" aria-label="상품 목록">
        {shown.map((p) => {
          const line = { kind: 'store' as const, productId: p.id, qty: 1 }
          const added = state.status === 'ready' && inCart(state.snapshot.cart, line)
          return (
            <article key={p.id} className="gcard">
              <GoodsImage category={p.category} product={p} alt={`${p.name} 그림`} />
              <div className="gbody">
                <span className="muted" style={{ fontSize: '.8rem' }}>{p.team}</span>
                <b>{p.name}</b>
                <span>{won(p.price)}</span>
                <button
                  className={added ? 'btn ghost' : 'btn'}
                  disabled={state.status !== 'ready'}
                  aria-label={`${p.name} 담기`}
                  onClick={() => void add(line).then(() => setNote(`${p.name}을(를) 장바구니에 담았어요.`))}
                >
                  {added ? '한 개 더 담기' : '담기'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
