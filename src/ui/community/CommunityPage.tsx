import { useSearchParams } from 'react-router'
import type { PlayerId } from '../../data/types'
import { relatedPosts, REPORT_HIDE_THRESHOLD, topDiscussed } from '../../domain/community/posts'
import { useLeague } from '../shared/LeagueContext'
import { useNow } from '../shared/useNow'
import { useCommunity } from './CommunityContext'
import Composer from './Composer'
import DemoReset from './DemoReset'
import PostCard from './PostCard'
import './community.css'

/** 화면 7. 커뮤니티 — 걸러 보기는 주소에 남는다: ?player=…(선수 관련 글) &media=1(사진·영상만) &write=…(이 선수 글쓰기) */
export default function CommunityPage() {
  const league = useLeague()
  const state = useCommunity()
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const playerId = params.get('player') as PlayerId | null
  const mediaOnly = params.get('media') === '1'
  const writeFor = params.get('write') as PlayerId | null
  const filterPlayer = playerId ? league.byId.get(playerId) : undefined

  const setFilter = (next: { player?: PlayerId | null; media?: boolean }) => {
    const q = new URLSearchParams()
    const player = next.player === undefined ? playerId : next.player
    const media = next.media ?? mediaOnly
    if (player) q.set('player', player)
    if (media) q.set('media', '1')
    setParams(q)
  }

  if (state.status === 'loading') return <p className="empty">커뮤니티를 불러오는 중이에요.</p>
  if (state.status === 'error') {
    return (
      <div className="panel" role="alert">
        <h2>커뮤니티를 열지 못했어요</h2>
        <p className="muted">{state.message}</p>
      </div>
    )
  }

  let list = state.posts
  if (filterPlayer) list = relatedPosts(list, filterPlayer)
  if (mediaOnly) list = list.filter((x) => x.media.length > 0)
  const players = [...league.hitters, ...league.pitchers]
  const top = topDiscussed(state.posts, players, now)

  return (
    <div className="comm">
      <div>
        {/* "이 선수 글쓰기"로 오면 그 선수 태그를 미리 달고 글 칸에 바로 쓸 수 있게 한다 */}
        <Composer key={writeFor ?? 'new'} initialTags={writeFor && league.byId.has(writeFor) ? [writeFor] : []} autoFocus={Boolean(writeFor)} />
        <div className="filters">
          <button className="chip" aria-pressed={!filterPlayer && !mediaOnly} onClick={() => setParams(new URLSearchParams())}>전체</button>
          <button className="chip" aria-pressed={mediaOnly} onClick={() => setFilter({ media: !mediaOnly })}>사진·영상만</button>
          {filterPlayer && (
            <button className="chip" aria-pressed="true" onClick={() => setFilter({ player: null })}>{filterPlayer.name} 관련 글 ✕</button>
          )}
        </div>
        <div aria-label="글 목록">
          {list.length ? (
            list.map((p) => <PostCard key={p.id} post={p} now={now} />)
          ) : (
            <p className="empty">{filterPlayer ? '이 선수 이야기는 아직 없어요. 위에서 첫 글을 남겨 보세요.' : '아직 글이 없어요. 첫 글을 남겨 보세요.'}</p>
          )}
        </div>
        <DemoReset />
      </div>
      <aside className="panel">
        <h2>이번 주 많이 이야기된 선수</h2>
        {top.length ? (
          <ol className="rank">
            {top.map(({ id, count }, i) => {
              const p = league.byId.get(id)!
              return (
                <li key={id}>
                  <button onClick={() => setFilter({ player: id })}>
                    <span className="n">{i + 1}</span>
                    <span>{p.name} <span className="muted">{p.team}</span></span>
                    <b>{count}개</b>
                  </button>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="muted" style={{ fontSize: '.9rem' }}>아직 집계할 글이 없어요.</p>
        )}
        <h2 style={{ marginTop: 18 }}>작성 규칙</h2>
        <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>
          심한 욕설, 혐오·비하 표현, 위협, 전화번호 같은 개인정보가 들어간 글은 올릴 수 없어요. 거친 표현은 자동으로 가려지고, 신고가
          {REPORT_HIDE_THRESHOLD}번 쌓인 글은 가려져요. 도배를 막기 위해 30초에 한 번 글을 올릴 수 있어요.
        </p>
      </aside>
    </div>
  )
}
