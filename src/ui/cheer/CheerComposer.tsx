import { useRef, useState } from 'react'
import type { PlayerId } from '../../data/types'
import { lastMessageAt, MAX_CHEER_LENGTH, prepareCheerMessage } from '../../domain/cheer/cheer'
import { moderate } from '../../domain/community/moderation'
import { ambiguousMessage, blockMessage } from '../../domain/community/posts'
import { useLeague } from '../shared/LeagueContext'
import { useCheer } from './CheerContext'

/** 늘 보이는 저장 위치 안내 (시연용이라 서버에 저장하지 않는다) */
const STORAGE_NOTE = {
  browser: '시연용이라 응원이 이 브라우저에만 저장돼요. 새로고침해도 남지만 다른 사람에게는 보이지 않아요.',
  memory: '시연용이라 응원이 이 브라우저에만 저장돼요. 다만 이 브라우저에서는 저장소를 쓸 수 없어 새로고침하면 사라져요.',
  shared: '여기 남긴 응원은 모두에게 보여요.',
} as const

const currentTime = () => Date.now()

/** 응원 메시지 쓰기: 커뮤니티 글쓰기와 같은 작성 제한(차단 안내, 애매하면 경고 후 선택, 30초 도배 제한), 글만 200자 */
export default function CheerComposer({ playerId, playerName }: { playerId: PlayerId; playerName: string }) {
  const league = useLeague()
  const state = useCheer()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ text: string; warn: boolean } | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  if (state.status !== 'ready') return null
  const { repo, user, snapshot } = state
  const players = [...league.hitters, ...league.pitchers]
  const mod = moderate(text, { names: players.map((p) => p.name) })
  const canPost = !busy && user !== null && mod.level !== 'block' && text.trim() !== ''

  async function submit(confirmAmbiguous = false) {
    if (!user) return
    const prepared = prepareCheerMessage({ text, confirmAmbiguous }, { players, lastPostAt: lastMessageAt(snapshot.messages, user.id), now: currentTime() })
    if (!prepared.ok) {
      if (prepared.reason === 'needs-confirm') setWarning(prepared.message)
      else setNote({ text: prepared.message, warn: true })
      return
    }
    setWarning(null)
    setBusy(true)
    try {
      await repo.postMessage({ playerId, text: prepared.text, caution: prepared.caution })
      setText('')
      setNote({ text: prepared.caution ? '응원을 남겼어요. 「주의」 표시가 붙었어요.' : '응원을 남겼어요.', warn: false })
    } catch {
      setNote({ text: '남기지 못했어요. 잠시 뒤 다시 시도해 주세요.', warn: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel composer" style={{ marginTop: 16 }}>
      <h2 style={{ marginTop: 0 }}>응원 메시지</h2>
      <p className="muted" style={{ fontSize: '.85rem', margin: '0 0 10px' }}>{STORAGE_NOTE[repo.storage]}</p>
      <textarea
        ref={textRef}
        rows={3}
        maxLength={MAX_CHEER_LENGTH}
        placeholder={`${playerName} 선수에게 응원 한마디`}
        aria-label="응원 메시지 내용"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setWarning(null)
        }}
      />
      <div className={`modmsg ${mod.level === 'ok' ? '' : mod.level}`} aria-live="polite">
        {mod.level === 'block' && <><b>이대로는 올릴 수 없어요.</b> {blockMessage(mod).replace('이대로는 올릴 수 없어요. ', '')}</>}
        {mod.level === 'mild' && `거친 표현(${mod.found.join(', ')})은 「거친 표현 가리기」를 켠 사람에게 ●●로 보여요.`}
        {mod.level === 'ambiguous' && !warning && `${ambiguousMessage(mod).split('. 고쳐 쓰거나')[0]}.`}
      </div>
      {warning && (
        <div className="modmsg block" role="alertdialog" aria-label="게시 전 확인">
          <p style={{ margin: '0 0 8px' }}><b>이대로 올릴까요?</b> {warning}</p>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost" onClick={() => { setWarning(null); textRef.current?.focus() }}>고쳐 쓰기</button>
            <button className="btn" disabled={busy} onClick={() => void submit(true)}>그래도 올리기</button>
          </div>
        </div>
      )}
      <div className="crow">
        <span className="muted" style={{ fontSize: '.8rem' }}>{text.length}/{MAX_CHEER_LENGTH}자</span>
        <button className="btn" style={{ marginLeft: 'auto' }} disabled={!canPost || warning !== null} onClick={() => void submit()}>응원 남기기</button>
      </div>
      <p className="muted" role="status" style={{ fontSize: '.8rem', margin: '10px 0 0', color: note?.warn ? 'var(--seam)' : undefined }}>
        {note?.text}
      </p>
    </div>
  )
}
