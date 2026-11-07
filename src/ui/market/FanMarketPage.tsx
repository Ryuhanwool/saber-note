import { useNavigate, useSearchParams } from 'react-router'
import type { PlayerId } from '../../data/types'
import { playerListings, SALE_RULES } from '../../domain/market/listing'
import { useLeague } from '../shared/LeagueContext'
import { sellPath } from './hooks'
import ListingCard from './ListingCard'
import { useMarket } from './MarketContext'
import { MarketNav, MarketStatus } from './shared'
import './market.css'

/** 판매 규칙 안내 (팬 마켓과 판매글 쓰기에 늘 보인다) */
export function SaleRules() {
  return (
    <section className="panel" aria-label="판매 규칙">
      <h2 style={{ marginTop: 0 }}>판매 규칙</h2>
      <ul className="rules">{SALE_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
    </section>
  )
}

/** 화면 10. 팬 마켓: 선수 관련 공식 굿즈 중고 판매글 (?player=…로 그 선수 상품만) */
export default function FanMarketPage() {
  const league = useLeague()
  const state = useMarket()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const player = league.byId.get(params.get('player') as PlayerId)
  const all = state.status === 'ready' ? state.snapshot.listings : []
  const list = player ? playerListings(all, player) : all

  return (
    <div>
      <h1 className="display" style={{ fontSize: '1.8rem', margin: '0 0 8px' }}>굿즈 마켓</h1>
      <MarketNav />
      <MarketStatus />
      <div className="comm" style={{ marginTop: 12 }}>
        <div>
          <div className="filters" style={{ marginTop: 0 }}>
            <button className="btn" onClick={() => navigate(sellPath(player?.id))}>판매글 쓰기</button>
            {player && <button className="chip" aria-pressed="true" onClick={() => setParams(new URLSearchParams())}>{player.name} 관련 상품 ✕</button>}
          </div>
          <div className="ggrid" aria-label="판매글 목록">
            {list.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
          {state.status === 'ready' && !list.length && (
            <p className="empty">{player ? '이 선수 관련 상품이 아직 없어요.' : '아직 판매글이 없어요.'}</p>
          )}
        </div>
        <aside>
          <SaleRules />
        </aside>
      </div>
    </div>
  )
}
