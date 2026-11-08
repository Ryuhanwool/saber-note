import { useEffect, useState } from 'react'
import type { CheerMessage } from '../../data/types'
import { canDelete, canReport, isHiddenByReports, REPORT_HIDE_THRESHOLD, timeAgo } from '../../domain/community/posts'
import { authorName, useShownText } from '../community/labels'
import { useRequireLogin } from '../auth/login'
import { useCheer } from './CheerContext'

const CONFIRM_MS = 4000

/** 응원 메시지 하나: 본문 · 「주의」 · 신고(두 번 눌러 확인) · 삭제(자기 메시지, 두 번 눌러 확인). 신고 3번이면 가린다 */
export default function CheerMessageCard({ message, now }: { message: CheerMessage; now: number }) {
  const state = useCheer()
  const [revealed, setRevealed] = useState(false)
  const [armed, setArmed] = useState<'report' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const shown = useShownText(message)
  const requireLogin = useRequireLogin()

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(null), CONFIRM_MS)
    return () => clearTimeout(t)
  }, [armed])

  if (state.status !== 'ready') return null
  const { repo, user } = state
  const me = user?.id ?? null

  if (isHiddenByReports(message) && !revealed) {
    return (
      <article className="post">
        <p className="muted" style={{ margin: 0 }}>
          신고가 누적돼 가려진 응원이에요. <button className="linkbtn" onClick={() => setRevealed(true)}>그래도 보기</button>
        </p>
      </article>
    )
  }

  const run = (action: () => Promise<void>) => {
    setError(null)
    action().catch(() => setError('반영하지 못했어요. 잠시 뒤 다시 시도해 주세요.'))
  }
  const reported = me !== null && message.reports.includes(me)

  return (
    <article className="post">
      <header className="ph2">
        <b>{authorName(message, '데모 응원')}</b>
        <span className="muted">{timeAgo(message.createdAt, now)}</span>
        {message.caution && <span className="tag caution" title="애매하다는 경고를 받고도 그대로 올린 응원이에요">주의</span>}
        {shown !== message.text && <span className="tag">일부 가림</span>}
      </header>
      <p className="ptext">{shown}</p>
      <footer className="pact">
        <button
          disabled={me !== null && !canReport(message, me)}
          onClick={() => requireLogin(me) && (armed === 'report' ? (setArmed(null), run(() => repo.report(message.id))) : setArmed('report'))}
        >
          {reported ? '신고함' : armed === 'report' ? `한 번 더 누르면 신고 (${REPORT_HIDE_THRESHOLD}번 쌓이면 가려져요)` : '신고'}
        </button>
        {canDelete(message, me) && (
          <button onClick={() => (armed === 'delete' ? (setArmed(null), run(() => repo.remove(message.id))) : setArmed('delete'))}>
            {armed === 'delete' ? '한 번 더 누르면 삭제' : '삭제'}
          </button>
        )}
      </footer>
      {error && <p className="muted" role="alert" style={{ color: 'var(--seam)', fontSize: '.85rem', margin: '8px 0 0' }}>{error}</p>}
    </article>
  )
}
