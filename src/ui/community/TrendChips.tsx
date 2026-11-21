import { Link } from 'react-router'
import type { PlayerId } from '../../data/types'
import { topCheered } from '../../domain/cheer/cheer'
import { useCheer } from '../cheer/CheerContext'
import { useLeague } from '../shared/LeagueContext'
import { cheerPath } from '../shared/labels'
import { useNow } from '../shared/useNow'

/**
 * 휴대폰 폭의 피드 위 한 줄: 이번 주 많이 이야기된 선수(누르면 그 선수 글만) · 이번 주 응원 순위(누르면 응원방).
 * 옆으로 밀어 본다. 넓은 화면에서는 오른쪽 칸에 목록으로 보여 준다
 */
export default function TrendChips({ top, onPick }: { top: { id: PlayerId; count: number }[]; onPick: (id: PlayerId) => void }) {
  const league = useLeague()
  const cheer = useCheer()
  const now = useNow()
  const cheered = cheer.status === 'ready' ? topCheered(cheer.snapshot.cheers, [...league.hitters, ...league.pitchers], now) : []
  if (!top.length && !cheered.length) return null
  return (
    <div className="trend-row" role="region" aria-label="이번 주 화제의 선수">
      {top.length > 0 && (
        <div className="trend-group" role="group" aria-label="이번 주 많이 이야기된 선수">
          <span className="trend-label">많이 이야기된</span>
          {top.map(({ id, count }) => (
            <button key={id} type="button" className="chip trend-chip" onClick={() => onPick(id)}>
              {league.byId.get(id)!.name} <small>{count}개</small>
            </button>
          ))}
        </div>
      )}
      {cheered.length > 0 && (
        <div className="trend-group" role="group" aria-label="이번 주 응원 순위">
          <span className="trend-label">응원 순위</span>
          {cheered.map(({ id, count }) => (
            <Link key={id} to={cheerPath(id)} className="chip trend-chip">
              {league.byId.get(id)!.name} <small>응원 {count}</small>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
