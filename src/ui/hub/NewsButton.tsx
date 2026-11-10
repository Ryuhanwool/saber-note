import { useId, useMemo } from 'react'
import { Link } from 'react-router'
import { formatRemaining, challengeSchedule } from '../../domain/games/schedule'
import { newsItems, type NewsItem } from '../../domain/hub/news'
import { useNow } from '../shared/useNow'
import { BellIcon } from './icons'
import { useHubData } from './useHubData'
import { usePopover } from './usePopover'

const ago = (ms: number) => {
  const m = Math.floor(ms / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`
}

const short = (t: string, n = 40) => (t.length > n ? `${t.slice(0, n)}…` : t)

function Row({ item, now, onGo }: { item: NewsItem; now: number; onGo: () => void }) {
  const [to, kind, text] =
    item.kind === 'post' ? ['/community', '커뮤니티 새 글', short(item.text)]
      : item.kind === 'listing' ? [`/market/fan/${encodeURIComponent(item.id)}`, '마켓 새 판매글', short(item.text)]
        : ['/games/challenge', '챌린지 마감 임박', `이번 주 세이버 픽 챌린지 마감까지 ${formatRemaining(item.deadline - now)}`]
  return (
    <li className={item.fresh ? 'fresh' : undefined}>
      <Link to={to} onClick={onGo}>
        <span className="news-kind">{item.fresh && <span className="dot" aria-hidden="true" />}{kind}{item.fresh && <span className="sr-only"> (새 소식)</span>}</span>
        <span className="news-text">{text}</span>
        <span className="news-time muted">{item.kind === 'challenge' ? '화요일 18:30 마감' : ago(now - item.at)}</span>
      </Link>
    </li>
  )
}

/** 아이콘 줄 「새 소식」: 다른 사람이 올린 커뮤니티 글·판매글, 챌린지 마감 알림. 열면 「마지막으로 본 때」를 지금으로 */
export default function NewsButton() {
  const d = useHubData()
  const now = useNow()
  const { open, setOpen, wrapRef, buttonRef } = usePopover()
  const panelId = useId()
  const news = useMemo(
    () => newsItems({ posts: d.posts, listings: d.listings, userId: d.account?.id ?? null, since: d.seen?.news ?? null, now, challenge: challengeSchedule(now) }),
    [d.posts, d.listings, d.account, d.seen, now],
  )
  // 프로필 저장소가 열리기 전에는 무엇을 봤는지 몰라 점을 달지 않는다
  const fresh = d.seen ? news.fresh : 0

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) void d.profileRepo?.markSeen('news', Date.now()).catch(() => {})
  }

  return (
    <div className="icon-wrap" ref={wrapRef}>
      <button
        type="button"
        ref={buttonRef}
        className="icon-btn"
        aria-label={fresh ? `새 소식 (${fresh}개 새로 옴)` : '새 소식'}
        title="새 소식"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <BellIcon />
        {fresh > 0 && <span className="dot badge-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div className="hub-pop panel" id={panelId} role="dialog" aria-label="새 소식">
          <h2>새 소식</h2>
          {news.items.length ? (
            <ul className="news-list">
              {news.items.map((it) => <Row key={`${it.kind}:${it.id}`} item={it} now={now} onGo={() => setOpen(false)} />)}
            </ul>
          ) : (
            <p className="muted">최근 7일 동안 새 소식이 없어요.</p>
          )}
          <p className="muted hub-pop-note">다른 팬의 커뮤니티 글·판매글과 챌린지 마감(24시간 전부터)을 알려 줘요.</p>
        </div>
      )}
    </div>
  )
}
