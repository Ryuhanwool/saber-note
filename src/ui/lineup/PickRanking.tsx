import { useMemo } from 'react'
import { Link } from 'react-router'
import { emptyLineup, sanitize } from '../../domain/lineup/lineup'
import { FAN_COUNT, virtualFanLineups } from '../../domain/lineup/fans'
import { pickCounts, pickRanking } from '../../domain/lineup/picks'
import { LINEUP_SLOTS, SLOT_LABEL, type LineupSlot } from '../../domain/lineup/slots'
import { useLeague, useLineupBasis } from '../shared/LeagueContext'
import { playerPath } from '../shared/labels'
import { useLineupStore } from './LineupContext'

/** 「포지션별 픽 순위」: 가상 팬 300명 + 내 저장된 라인업 */
export default function PickRanking({ slot, onSlot }: { slot: LineupSlot; onSlot: (s: LineupSlot) => void }) {
  const league = useLeague()
  const { basis, roles } = useLineupBasis()
  const store = useLineupStore()
  const fans = useMemo(() => virtualFanLineups(basis, roles), [basis, roles])
  // 픽에 더하는 것은 저장된 내 라인업뿐 (고르는 중인 라인업은 넣지 않는다)
  const saved = store.status === 'ready' ? store.mine : null
  const mine = useMemo(() => (saved ? sanitize(saved, league, roles) : null), [saved, league, roles])
  const hasMine = mine !== null && JSON.stringify(mine) !== JSON.stringify(emptyLineup())
  const picks = useMemo(() => pickCounts(fans, mine), [fans, mine])
  const rows = pickRanking(slot, picks, league, roles, mine)
  const extra = slot === 'CL' ? '세이브' : slot === 'MR' ? '홀드' : null

  return (
    <div className="picks">
      <div className="pos-tabs" role="tablist" aria-label="포지션">
        {LINEUP_SLOTS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={s === slot} onClick={() => onSlot(s)}>{SLOT_LABEL[s]}</button>
        ))}
      </div>
      <p className="picks-basis">
        <b>가상 팬 {FAN_COUNT}명 + 내 라인업 기준</b>
        <span className="muted">
          {store.status !== 'ready' ? ' · 내 라인업을 불러오는 중…'
            : !store.user ? ' · 로그인해서 라인업을 저장하면 내 픽이 더해져요'
            : hasMine ? ' · 저장한 내 라인업이 들어 있어요'
            : ' · 아직 저장한 내 라인업이 없어요'}
        </span>
      </p>
      <div className="picks-table-wrap" role="tabpanel" aria-label={`${SLOT_LABEL[slot]} 픽 순위`}>
        <table className="picks-table">
          <caption className="sr-only">{SLOT_LABEL[slot]} 픽 순위 상위 {rows.length}명</caption>
          <thead>
            <tr>
              <th scope="col">순위</th>
              <th scope="col">선수</th>
              <th scope="col" className="picks-team">팀</th>
              <th scope="col" className="num">픽 수</th>
              <th scope="col" className="num">픽률</th>
              {extra && <th scope="col" className="num">{extra}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.player.id} className={r.mine ? 'mine' : ''}>
                <td className="picks-rank">{r.rank}</td>
                <th scope="row">
                  <Link to={playerPath(r.player.id)}>{r.player.name}</Link>
                  {r.mine && <span className="mine-badge">내 픽</span>}
                  <span className="picks-team-inline">{r.player.team}</span>
                </th>
                <td className="picks-team">{r.player.team}</td>
                <td className="num">{r.count.toLocaleString('ko-KR')}</td>
                <td className="num">{r.pct.toFixed(1)}%</td>
                {extra && <td className="num">{r.player.type === 'P' ? ((slot === 'CL' ? r.player.raw.SV : r.player.raw.HLD) ?? 0) : '-'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted picks-note">
        픽률은 그 자리를 채운 라인업 중 그 선수를 고른 비율이에요. 가상 팬의 픽은 날짜와 상관없이 같아요. 선수 이름을 누르면 선수 카드로 가요.
      </p>
    </div>
  )
}
