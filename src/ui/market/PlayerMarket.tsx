import { useNavigate } from 'react-router'
import { won } from '../../domain/market/catalog'
import { playerListings, sellerLabel } from '../../domain/market/listing'
import type { Player } from '../../domain/players'
import { listingPath, sellPath } from './hooks'
import { useRequireLogin } from '../auth/login'
import { useMarket } from './MarketContext'
import './market.css'

/** 선수 카드·응원방의 "이 선수 관련 상품": 판매글 수, 최근 2개, 모두 보기, 이 선수 상품 팔기 */
export default function PlayerMarket({ player }: { player: Player }) {
  const state = useMarket()
  const navigate = useNavigate()
  const requireLogin = useRequireLogin()
  const list = state.status === 'ready' ? playerListings(state.snapshot.listings, player) : []
  return (
    <div className="panel" style={{ marginTop: 16 }} aria-label="이 선수 관련 상품">
      <div className="ph" style={{ marginBottom: 6 }}>
        <div>
          <h2 style={{ margin: 0 }}>이 선수 관련 상품</h2>
          <div className="muted" style={{ fontSize: '.9rem' }}>
            {state.status === 'loading' && '불러오는 중'}
            {state.status === 'error' && '마켓을 열지 못했어요'}
            {state.status === 'ready' && (list.length ? <>팬 마켓 판매글 <b>{list.length}개</b></> : '아직 이 선수 관련 상품이 없어요.')}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost" disabled={!list.length} onClick={() => navigate(`/market/fan?${new URLSearchParams({ player: player.id })}`)}>관련 상품 모두 보기</button>
          <button className="btn" disabled={state.status !== 'ready'} onClick={() => requireLogin(state.status === 'ready' && state.user, { next: sellPath(player.id) }) && navigate(sellPath(player.id))}>이 선수 상품 팔기</button>
        </div>
      </div>
      {list.slice(0, 2).map((l) => (
        <button key={l.id} className="mini mlink" onClick={() => navigate(listingPath(l.id))}>
          <span className="muted">{sellerLabel(l)} · {l.condition}</span>
          <span><b>{l.title}</b> {won(l.price)}</span>
        </button>
      ))}
    </div>
  )
}
