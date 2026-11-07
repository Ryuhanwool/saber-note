import { useNavigate } from 'react-router'
import { isHiddenByReports, playerBuzz, relatedPosts, timeAgo } from '../../domain/community/posts'
import type { Player } from '../../domain/players'
import { useNow } from '../shared/useNow'
import { useCommunity } from './CommunityContext'
import type { CommunityPost } from '../../data/types'
import { authorName, useShownText } from './labels'
import './community.css'

/** 최근 글 한 줄 미리보기 (가리기 규칙은 피드와 같다) */
function Preview({ post }: { post: CommunityPost }) {
  const text = useShownText(post)
  return <div>{text.slice(0, 90)}{text.length > 90 && '…'}{post.caution && <span className="tag caution">주의</span>}</div>
}

const communityPath = (q: Record<string, string>) => `/community?${new URLSearchParams(q)}`

/** 선수 카드 아래 "커뮤니티 이야기": 관련 글 수, 최근 24시간 글 수, 최근 글 2개, 관련 글 보기·글쓰기 */
export default function PlayerCommunity({ player }: { player: Player }) {
  const state = useCommunity()
  const navigate = useNavigate()
  const now = useNow()
  const ready = state.status === 'ready'
  const rel = ready ? relatedPosts(state.posts, player) : []
  const buzz = ready ? playerBuzz(state.posts, player, now) : null

  return (
    <div className="panel" style={{ marginTop: 16 }} aria-label="커뮤니티 이야기">
      <div className="ph" style={{ marginBottom: 6 }}>
        <div>
          <h2 style={{ margin: 0 }}>커뮤니티 이야기</h2>
          <div className="muted" style={{ fontSize: '.9rem' }}>
            {state.status === 'loading' && '불러오는 중'}
            {state.status === 'error' && '커뮤니티를 열지 못했어요'}
            {buzz && (buzz.total ? <>이 선수 관련 글 <b>{buzz.total}개</b>, 최근 24시간 {buzz.last24h}개</> : '아직 이 선수 이야기가 없어요. 첫 글을 남겨 보세요.')}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost" disabled={!rel.length} onClick={() => navigate(communityPath({ player: player.id }))}>관련 글 모두 보기</button>
          <button className="btn" disabled={!ready} onClick={() => navigate(communityPath({ player: player.id, write: player.id }))}>이 선수 글쓰기</button>
        </div>
      </div>
      {ready && rel.slice(0, 2).map((x) => (
        <div key={x.id} className="mini">
          <span className="muted">{authorName(x, state.user?.id ?? null)}, {timeAgo(x.createdAt, now)}</span>
          {isHiddenByReports(x) ? (
            <div className="muted">신고가 누적돼 가려진 글이에요.</div>
          ) : (
            <Preview post={x} />
          )}
          {x.media.length > 0 && <span className="tag" style={{ margin: 0, alignSelf: 'flex-start' }}>사진·영상 {x.media.length}개</span>}
        </div>
      ))}
    </div>
  )
}
