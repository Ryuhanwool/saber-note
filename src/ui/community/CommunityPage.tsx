import { useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { PlayerId } from '../../data/types'
import { relatedPosts, topDiscussed } from '../../domain/community/posts'
import { useLeague } from '../shared/LeagueContext'
import { peekDraft } from '../auth/login'
import MoreButton from '../shared/MoreButton'
import Sheet from '../shared/Sheet'
import { PHONE_QUERY, useMediaQuery } from '../shared/useMediaQuery'
import { usePaged } from '../shared/usePaged'
import { useNow } from '../shared/useNow'
import { useCommunity } from './CommunityContext'
import CheerRanking from '../cheer/CheerRanking'
import Composer from './Composer'
import PostCard from './PostCard'
import TrendChips from './TrendChips'
import WriteRules from './WriteRules'
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
  const phone = useMediaQuery(PHONE_QUERY)
  // 글쓰기 창: 「이 선수 글쓰기」로 왔거나, 로그인하러 갔다 와서 써 두던 글이 있으면 바로 열어 둔다
  const [sheet, setSheet] = useState(() => ({ for: writeFor, open: Boolean(writeFor) || peekDraft('community') !== '' }))
  if (sheet.for !== writeFor) setSheet({ for: writeFor, open: Boolean(writeFor) || sheet.open })
  const sheetOpen = sheet.open
  const setSheetOpen = (open: boolean) => setSheet((x) => ({ ...x, open }))
  const [posted, setPosted] = useState<string | null>(null)
  const writeBtn = useRef<HTMLButtonElement>(null)
  const closeSheet = useCallback(() => {
    setSheet((x) => ({ ...x, open: false }))
    writeBtn.current?.focus()
  }, [])
  const filterPlayer = playerId ? league.byId.get(playerId) : undefined

  const setFilter = (next: { player?: PlayerId | null; media?: boolean }) => {
    const q = new URLSearchParams()
    const player = next.player === undefined ? playerId : next.player
    const media = next.media ?? mediaOnly
    if (player) q.set('player', player)
    if (media) q.set('media', '1')
    setParams(q)
  }

  // 피드: 걸러 본 글을 처음 20개만, 「더 보기」로 20개씩 (걸러 보기가 바뀌면 다시 20개)
  let list = state.status === 'ready' ? state.posts : []
  if (filterPlayer) list = relatedPosts(list, filterPlayer)
  if (mediaOnly) list = list.filter((x) => x.media.length > 0)
  const paged = usePaged(list, `${playerId ?? ''}|${mediaOnly}`)

  if (state.status === 'loading') return <p className="empty">커뮤니티를 불러오는 중이에요.</p>
  if (state.status === 'error') {
    return (
      <div className="panel" role="alert">
        <h2>커뮤니티를 열지 못했어요</h2>
        <p className="muted">{state.message}</p>
      </div>
    )
  }

  const players = [...league.hitters, ...league.pitchers]
  const top = topDiscussed(state.posts, players, now)

  return (
    <div className="comm">
      <div>
        <div className="write-bar">
          <button type="button" ref={writeBtn} className="btn" aria-haspopup="dialog" onClick={() => { setPosted(null); setSheetOpen(true) }}>글쓰기</button>
          <div className="filters" role="group" aria-label="걸러 보기">
            <button className="chip" aria-pressed={!filterPlayer && !mediaOnly} onClick={() => setParams(new URLSearchParams())}>전체</button>
            <button className="chip" aria-pressed={mediaOnly} onClick={() => setFilter({ media: !mediaOnly })}>사진·영상만</button>
            {filterPlayer && (
              <button className="chip" aria-pressed="true" onClick={() => setFilter({ player: null })}>{filterPlayer.name} 관련 글 ✕</button>
            )}
          </div>
          <p className="muted write-note" role="status">{posted ?? ''}</p>
        </div>
        <Sheet open={sheetOpen} onClose={closeSheet} title="글쓰기">
          {/* 휴대폰 폭: 작성 규칙은 오른쪽 칸 대신 글쓰기 창 안에 */}
          {/* "이 선수 글쓰기"로 오면 그 선수 태그를 미리 달고 글 칸에 바로 쓸 수 있게 한다 */}
          <Composer
            key={writeFor ?? 'new'}
            initialTags={writeFor && league.byId.has(writeFor) ? [writeFor] : []}
            autoFocus={Boolean(writeFor)}
            onPosted={(m) => { setPosted(m); closeSheet() }}
          />
          {phone && <WriteRules compact />}
        </Sheet>
        {phone && <TrendChips top={top} onPick={(id) => setFilter({ player: id })} />}
        <div aria-label="글 목록">
          {list.length ? (
            <>
              {paged.shown.map((p) => <PostCard key={p.id} post={p} now={now} />)}
              <MoreButton rest={paged.rest} total={paged.total} unit="개" onMore={paged.more} />
            </>
          ) : (
            <p className="empty">{filterPlayer ? '이 선수 이야기는 아직 없어요. 위에서 첫 글을 남겨 보세요.' : '아직 글이 없어요. 첫 글을 남겨 보세요.'}</p>
          )}
        </div>
      </div>
      {!phone && (
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
        <div style={{ marginTop: 18 }}>
          <CheerRanking />
        </div>
        <div style={{ marginTop: 18 }}>
          <WriteRules />
        </div>
      </aside>
      )}
    </div>
  )
}
