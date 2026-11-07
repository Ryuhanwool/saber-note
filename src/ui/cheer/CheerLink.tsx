import { useNavigate } from 'react-router'
import { cheerCount } from '../../domain/cheer/cheer'
import type { Player } from '../../domain/players'
import { cheerPath } from '../shared/labels'
import { useNow } from '../shared/useNow'
import { useCheer } from './CheerContext'

/** 선수 카드 위쪽의 「응원방 · 응원 N」 버튼 */
export default function CheerLink({ player }: { player: Player }) {
  const state = useCheer()
  const navigate = useNavigate()
  const now = useNow()
  const total = state.status === 'ready' ? cheerCount(state.snapshot.cheers, player.id, now).total : null
  return (
    <button className="btn ghost" onClick={() => navigate(cheerPath(player.id))}>
      응원방{total !== null && ` · 응원 ${total.toLocaleString()}`}
    </button>
  )
}
