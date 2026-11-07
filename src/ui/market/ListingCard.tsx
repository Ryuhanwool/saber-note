import { Link } from 'react-router'
import type { MarketListing } from '../../data/types'
import { isHiddenByReports } from '../../domain/community/posts'
import { CATEGORIES, won } from '../../domain/market/catalog'
import { listingWarnings } from '../../domain/market/listing'
import { listingPath } from './hooks'
import { ListingPhoto } from './shared'

/** 팬 마켓 목록의 판매글 하나 (누르면 판매글 화면) */
export default function ListingCard({ listing: l }: { listing: MarketListing }) {
  const warn = listingWarnings(l).length > 0 || l.caution
  if (isHiddenByReports(l)) {
    return (
      <article className="gcard">
        <div className="gbody"><span className="muted">신고가 누적돼 가려진 판매글이에요.</span><Link to={listingPath(l.id)}>그래도 보기</Link></div>
      </article>
    )
  }
  return (
    <article className="gcard">
      <Link to={listingPath(l.id)} className="gphoto" aria-label={`${l.title} 판매글 보기`}>
        <ListingPhoto listing={l} />
      </Link>
      <div className="gbody">
        <span className="muted" style={{ fontSize: '.8rem' }}>{CATEGORIES[l.category].label} · {l.condition} · {l.sellerName}</span>
        <Link to={listingPath(l.id)}><b>{l.title}</b></Link>
        <span>{won(l.price)}{warn && <span className="tag caution">주의</span>}</span>
      </div>
    </article>
  )
}
