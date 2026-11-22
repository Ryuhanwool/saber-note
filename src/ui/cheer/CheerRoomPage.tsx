import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AlreadyCheeredError } from '../../data/source'
import type { PlayerId } from '../../data/types'
import { cheerCount, cheeredToday, messagesFor } from '../../domain/cheer/cheer'
import type { Player } from '../../domain/players'
import PlayerMarket from '../market/PlayerMarket'
import { useLeague } from '../shared/LeagueContext'
import { playerPath, positionLabel } from '../shared/labels'
import { useNow } from '../shared/useNow'
import { useRequireLogin } from '../auth/login'
import { useCheer } from './CheerContext'
import { peekDraft } from '../auth/login'
import MoreButton from '../shared/MoreButton'
import Sheet from '../shared/Sheet'
import { usePaged } from '../shared/usePaged'
import CheerComposer from './CheerComposer'
import CheerMessageCard from './CheerMessageCard'
import CheerRanking from './CheerRanking'
import '../community/community.css'
import './cheer.css'

/** 「응원하기」 버튼과 누적·이번 주 응원 수 */
function CheerBox({ player }: { player: Player }) {
  const state = useCheer()
  const now = useNow()
  const [note, setNote] = useState<{ text: string; warn: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const requireLogin = useRequireLogin()
  if (state.status === 'loading') return <p className="muted">응원 기록을 불러오는 중이에요.</p>
  if (state.status === 'error') return <p className="muted" role="alert">응원방을 열지 못했어요. {state.message}</p>
  const { repo, user, snapshot } = state
  const count = cheerCount(snapshot.cheers, player.id, now)
  const done = user !== null && cheeredToday(snapshot.cheers, player.id, user.id, now)

  async function cheer() {
    if (!requireLogin(user)) return
    setBusy(true)
    try {
      await repo.cheer(player.id)
      setNote({ text: `${player.name} 선수를 응원했어요! 내일 또 응원할 수 있어요.`, warn: false })
    } catch (e) {
      setNote({ text: e instanceof AlreadyCheeredError ? '오늘은 이미 응원했어요. 내일 또 응원해 주세요.' : '응원하지 못했어요. 잠시 뒤 다시 시도해 주세요.', warn: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cheerbox">
      <button className="btn cheerbtn" disabled={busy || done} onClick={() => void cheer()}>
        {done ? '오늘 응원했어요' : '📣 응원하기'}
      </button>
      <div>
        <div className="cheercount" aria-label="누적 응원 수"><b>{count.total.toLocaleString()}</b> 누적 응원</div>
        <div className="muted" style={{ fontSize: '.85rem' }}>이번 주 {count.week} · 한 사람이 하루 1번 응원할 수 있어요</div>
      </div>
      <p className="muted" role="status" style={{ flexBasis: '100%', fontSize: '.85rem', margin: 0, color: note?.warn ? 'var(--seam)' : undefined }}>{note?.text}</p>
    </div>
  )
}

function CheerRoom({ player: p }: { player: Player }) {
  const navigate = useNavigate()
  const state = useCheer()
  const now = useNow()
  const list = state.status === 'ready' ? messagesFor(state.snapshot.messages, p.id) : []
  // 응원 메시지 타임라인도 처음 20개만, 「더 보기」로 20개씩
  const paged = usePaged(list, p.id)
  // 응원 메시지 쓰기 창: 로그인하러 갔다 와서 써 두던 응원이 있으면 바로 열어 둔다
  const [sheetOpen, setSheetOpen] = useState(() => peekDraft(`cheer:${p.id}`) !== '')
  const [posted, setPosted] = useState<string | null>(null)
  const writeBtn = useRef<HTMLButtonElement>(null)
  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    writeBtn.current?.focus()
  }, [])

  return (
    <>
      <button className="back" onClick={() => navigate(playerPath(p.id))}>‹ 선수 카드로</button>
      <div className="comm">
        <div>
          <div className="panel">
            <h1 className="display" style={{ fontSize: 'clamp(1.8rem,5vw,2.4rem)', margin: 0 }}>{p.name} 응원방</h1>
            <div className="meta" style={{ marginBottom: 14 }}>
              <span>{p.team}</span>
              <span>{positionLabel(p)}</span>
            </div>
            <CheerBox player={p} />
          </div>
          <div className="write-bar" style={{ marginTop: 16 }}>
            <button type="button" ref={writeBtn} className="btn" aria-haspopup="dialog" onClick={() => { setPosted(null); setSheetOpen(true) }}>응원 메시지 쓰기</button>
            <p className="muted write-note" role="status">{posted ?? ''}</p>
          </div>
          <Sheet open={sheetOpen} onClose={closeSheet} title="응원 메시지 쓰기">
            <CheerComposer playerId={p.id} playerName={p.name} onPosted={(m) => { setPosted(m); closeSheet() }} />
          </Sheet>
          <section aria-label="응원 메시지 목록" style={{ marginTop: 16 }}>
            {state.status === 'ready' && (list.length ? (
              <>
                {paged.shown.map((m) => <CheerMessageCard key={m.id} message={m} now={now} />)}
                <MoreButton rest={paged.rest} total={paged.total} unit="개" onMore={paged.more} />
              </>
            ) : (
              <p className="empty">아직 응원 메시지가 없어요. 첫 응원을 남겨 보세요.</p>
            ))}
          </section>
          <PlayerMarket player={p} />
        </div>
        <aside className="panel">
          <CheerRanking current={p.id} />
          <h2 style={{ marginTop: 18 }}>작성 규칙</h2>
          <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>
            커뮤니티와 같은 규칙이에요. 경기·플레이에 대한 욕은 괜찮지만 패드립, 협박, 인신공격, 혐오·비하, 성적 모욕, 개인정보는 올릴 수 없어요.
            애매한 응원은 한 번 더 물어보고, 신고가 3번 쌓이면 가려져요. 30초에 한 번 남길 수 있어요.
          </p>
        </aside>
      </div>
    </>
  )
}

/** 화면 8. 선수 응원방 (/player/:id/cheer) */
export default function CheerRoomPage() {
  const league = useLeague()
  const navigate = useNavigate()
  const { id } = useParams()
  const player = id ? league.byId.get(id as PlayerId) : undefined
  if (!player) {
    return (
      <div className="panel">
        <p className="empty">선수를 찾을 수 없어요.</p>
        <button className="btn ghost" onClick={() => navigate('/')}>검색으로 돌아가기</button>
      </div>
    )
  }
  return <CheerRoom key={player.id} player={player} />
}
