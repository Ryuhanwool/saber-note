import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { canDelete, canReport, REPORT_HIDE_THRESHOLD, timeAgo } from '../../domain/community/posts'
import { canBuyListing, inCart } from '../../domain/market/cart'
import { CATEGORIES, won } from '../../domain/market/catalog'
import { listingWarnings } from '../../domain/market/listing'
import { useShownText } from '../community/labels'
import { useLeague } from '../shared/LeagueContext'
import { playerPath } from '../shared/labels'
import { useNow } from '../shared/useNow'
import { useMarket } from './MarketContext'
import { useAddToCart } from './hooks'
import { ListingPhoto, MarketNav, MarketStatus } from './shared'
import './market.css'

const CONFIRM_MS = 4000

/** 화면 11. 판매글: 사진 · 가격·상태 · 선수 태그 · 「주의」 경고 · 장바구니에 담기 · 신고 · 삭제(자기 글) */
export default function ListingPage() {
  const league = useLeague()
  const state = useMarket()
  const navigate = useNavigate()
  const add = useAddToCart()
  const now = useNow()
  const { id } = useParams()
  const [armed, setArmed] = useState<'report' | 'delete' | null>(null)
  const [note, setNote] = useState<{ text: string; warn: boolean } | null>(null)
  const listing = state.status === 'ready' ? state.snapshot.listings.find((l) => l.id === id) : undefined
  const text = useShownText(listing ?? { text: '', caution: false })

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(null), CONFIRM_MS)
    return () => clearTimeout(t)
  }, [armed])

  if (state.status !== 'ready') return <MarketStatus />
  if (!listing) {
    return (
      <div className="panel">
        <p className="empty">판매글을 찾을 수 없어요. 지워졌을 수 있어요.</p>
        <button className="btn ghost" onClick={() => navigate('/market/fan')}>팬 마켓으로</button>
      </div>
    )
  }
  const { repo, user, snapshot } = state
  const me = user?.id ?? null
  const l = listing
  const warnings = listingWarnings(l)
  const line = { kind: 'listing' as const, listingId: l.id }
  const added = inCart(snapshot.cart, line)
  const run = (action: () => Promise<void>, done?: string) => {
    setNote(null)
    action().then(() => done && setNote({ text: done, warn: false }), () => setNote({ text: '반영하지 못했어요. 잠시 뒤 다시 시도해 주세요.', warn: true }))
  }

  return (
    <div>
      <h1 className="display" style={{ fontSize: '1.8rem', margin: '0 0 8px' }}>굿즈 마켓</h1>
      <MarketNav />
      <button className="back" style={{ marginTop: 12 }} onClick={() => navigate('/market/fan')}>‹ 팬 마켓으로</button>
      <article className="panel listing">
        <div className="lphotos">
          {(l.media.length ? l.media : [null]).map((_, i) => <ListingPhoto key={i} listing={l} index={i} />)}
        </div>
        <div>
          <h2 style={{ margin: '0 0 4px' }}>{l.title}</h2>
          <div className="lprice">{won(l.price)}</div>
          <dl className="ldl">
            <dt>종류</dt><dd>{CATEGORIES[l.category].label}</dd>
            <dt>상태</dt><dd>{l.condition}</dd>
            <dt>판매자</dt><dd>{l.authorId === me ? '나' : l.sellerName}</dd>
            <dt>올린 때</dt><dd>{timeAgo(l.createdAt, now)}</dd>
          </dl>
          <div className="ptags">
            {l.players.map((pid) => {
              const p = league.byId.get(pid)
              return p && <button key={pid} className="chip small" onClick={() => navigate(playerPath(pid))}>{p.name}</button>
            })}
          </div>
          {(warnings.length > 0 || l.caution) && (
            <div className="modmsg block" role="note" aria-label="주의" style={{ marginTop: 12 }}>
              <b>주의</b>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {warnings.map((w) => <li key={w.kind}>{w.message}</li>)}
                {l.caution && <li>애매한 표현 경고를 받고도 올린 판매글이에요</li>}
              </ul>
              <p style={{ margin: '6px 0 0' }}>선입금이나 외부 메신저 거래는 하지 말고, 앱 안에서 거래하세요.</p>
            </div>
          )}
          {l.text && <p className="ptext">{text}</p>}
          <div className="row" style={{ gap: 8, marginTop: 14 }}>
            <button className="btn" disabled={!canBuyListing(l, me) || added} onClick={() => run(() => add(line), '장바구니에 담았어요.')}>
              {l.authorId === me ? '내 판매글이에요' : added ? '장바구니에 있어요' : '장바구니에 담기'}
            </button>
            <button className="btn ghost" disabled={!canReport(l, me)} onClick={() => (armed === 'report' ? (setArmed(null), run(() => repo.report(l.id), '신고했어요.')) : setArmed('report'))}>
              {me !== null && l.reports.includes(me) ? '신고함' : armed === 'report' ? `한 번 더 누르면 신고 (${REPORT_HIDE_THRESHOLD}번 쌓이면 가려져요)` : '신고'}
            </button>
            {canDelete(l, me) && (
              <button className="btn ghost" onClick={() => (armed === 'delete' ? (setArmed(null), run(() => repo.remove(l.id).then(() => navigate('/market/fan')))) : setArmed('delete'))}>
                {armed === 'delete' ? '한 번 더 누르면 삭제' : '삭제'}
              </button>
            )}
          </div>
          <p className="muted" role="status" style={{ fontSize: '.85rem', margin: '8px 0 0', color: note?.warn ? 'var(--seam)' : undefined }}>{note?.text}</p>
        </div>
      </article>
    </div>
  )
}
