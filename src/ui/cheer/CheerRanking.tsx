import { useNavigate } from 'react-router'
import type { PlayerId } from '../../data/types'
import { topCheered } from '../../domain/cheer/cheer'
import { useLeague } from '../shared/LeagueContext'
import { cheerPath } from '../shared/labels'
import { useNow } from '../shared/useNow'
import { useCheer } from './CheerContext'

/** 이번 주 응원 순위: 최근 7일 「응원하기」를 많이 받은 선수 5명. 누르면 그 선수 응원방으로 */
export default function CheerRanking({ current }: { current?: PlayerId }) {
  const league = useLeague()
  const state = useCheer()
  const navigate = useNavigate()
  const now = useNow()
  if (state.status !== 'ready') return null
  const top = topCheered(state.snapshot.cheers, [...league.hitters, ...league.pitchers], now)

  return (
    <section aria-label="이번 주 응원 순위">
      <h2>이번 주 응원 순위</h2>
      {top.length ? (
        <ol className="rank">
          {top.map(({ id, count }, i) => {
            const p = league.byId.get(id)!
            return (
              <li key={id}>
                <button aria-current={id === current ? 'true' : undefined} onClick={() => navigate(cheerPath(id))}>
                  <span className="n">{i + 1}</span>
                  <span>{p.name} <span className="muted">{p.team}</span></span>
                  <b>응원 {count}</b>
                </button>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="muted" style={{ fontSize: '.9rem' }}>이번 주에는 아직 응원이 없어요.</p>
      )}
      <p className="muted" style={{ fontSize: '.8rem', margin: '6px 0 0' }}>최근 7일 동안 받은 「응원하기」 수예요.</p>
    </section>
  )
}
