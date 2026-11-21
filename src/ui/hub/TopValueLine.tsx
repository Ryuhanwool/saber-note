import { useMemo } from 'react'
import { Link } from 'react-router'
import { valueRanking } from '../../domain/value/ranking'
import { formatWon } from '../../domain/value/value'
import { useLeague } from '../shared/LeagueContext'
import { playerPath } from '../shared/labels'

/** 홈 아래 한 줄: 가치 순위 상위 3명 (예전 「WAR 상위 타자·투수」 목록을 줄인 것) */
export default function TopValueLine() {
  const league = useLeague()
  const top = useMemo(() => valueRanking(league, null).slice(0, 3), [league])
  return (
    <section className="top-value" aria-labelledby="top-value-h">
      <h2 id="top-value-h" className="top-value-title">가치 순위 TOP 3</h2>
      <ol className="top-value-list">
        {top.map((r) => (
          <li key={r.player.id}>
            <Link to={`${playerPath(r.player.id)}?tab=value`}>
              <span className="tv-rank">{r.rank}</span> {r.player.name} <b>{formatWon(r.value.total)}</b>
            </Link>
          </li>
        ))}
      </ol>
      <Link className="top-value-more" to="/ranking">전체 순위 <span aria-hidden="true">›</span></Link>
    </section>
  )
}
