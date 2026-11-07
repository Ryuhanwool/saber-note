import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import type { CommunityPost } from '../../data/types'
import { canDelete, canReport, isHiddenByReports, REPORT_HIDE_THRESHOLD, timeAgo } from '../../domain/community/posts'
import { useLeague } from '../shared/LeagueContext'
import { playerPath } from '../shared/labels'
import { useCommunity } from './CommunityContext'
import { authorName } from './labels'
import PostMedia from './PostMedia'

const CONFIRM_MS = 4000

/** 피드의 글 하나: 본문 · 파일 · 선수 태그 · 좋아요 · 신고(두 번 눌러 확인) · 삭제(자기 글, 두 번 눌러 확인) */
export default function PostCard({ post, now }: { post: CommunityPost; now: number }) {
  const league = useLeague()
  const navigate = useNavigate()
  const state = useCommunity()
  const [revealed, setRevealed] = useState(false)
  const [armed, setArmed] = useState<'report' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 한 번 누른 뒤 4초 안에 다시 누르지 않으면 원래대로
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(null), CONFIRM_MS)
    return () => clearTimeout(t)
  }, [armed])

  if (state.status !== 'ready') return null
  const { repo, user } = state
  const me = user?.id ?? null

  if (isHiddenByReports(post) && !revealed) {
    return (
      <article className="post">
        <p className="muted" style={{ margin: 0 }}>
          신고가 누적돼 가려진 글이에요. <button className="linkbtn" onClick={() => setRevealed(true)}>그래도 보기</button>
        </p>
      </article>
    )
  }

  const run = (action: () => Promise<void>) => {
    setError(null)
    action().catch(() => setError('반영하지 못했어요. 잠시 뒤 다시 시도해 주세요.'))
  }
  const liked = me !== null && post.likes.includes(me)
  const reported = me !== null && post.reports.includes(me)

  return (
    <article className="post">
      <header className="ph2">
        <span className="av ph3" />
        <b>{authorName(post, me)}</b>
        <span className="muted">{timeAgo(post.createdAt, now)}</span>
        {post.masked && <span className="tag">일부 가림</span>}
      </header>
      {post.text && <p className="ptext">{post.text}</p>}
      <PostMedia media={post.media} />
      {post.players.length > 0 && (
        <div className="ptags">
          {post.players.map((id) => {
            const p = league.byId.get(id)
            return p && <button key={id} className="chip small" onClick={() => navigate(playerPath(id))}>{p.name}</button>
          })}
        </div>
      )}
      <footer className="pact">
        <button aria-pressed={liked} disabled={me === null} onClick={() => run(() => repo.toggleLike(post.id))}>좋아요 {post.likes.length}</button>
        <button
          disabled={!canReport(post, me)}
          onClick={() => (armed === 'report' ? (setArmed(null), run(() => repo.report(post.id))) : setArmed('report'))}
        >
          {reported ? '신고함' : armed === 'report' ? `한 번 더 누르면 신고 (${REPORT_HIDE_THRESHOLD}번 쌓이면 가려져요)` : '신고'}
        </button>
        {canDelete(post, me) && (
          <button onClick={() => (armed === 'delete' ? (setArmed(null), run(() => repo.remove(post.id))) : setArmed('delete'))}>
            {armed === 'delete' ? '한 번 더 누르면 삭제' : '삭제'}
          </button>
        )}
      </footer>
      {error && <p className="muted" role="alert" style={{ color: 'var(--seam)', fontSize: '.85rem', margin: '8px 0 0' }}>{error}</p>}
    </article>
  )
}
