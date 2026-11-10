import { Link } from 'react-router'
import { LINEUP_SLOTS } from '../../domain/lineup/slots'
import { lineupTotals, sanitize } from '../../domain/lineup/lineup'
import { formatWon } from '../../domain/value/value'
import { useLineupStore } from '../lineup/LineupContext'
import { useLeague, useLineupBasis } from '../shared/LeagueContext'
import { DiamondIcon } from './icons'

/** 프로필 줄 아래 「내 라인업」 띠: 저장된 라인업의 총 예상 가치 · 총 WAR · 채운 자리 수, 「라인업 편집」(없으면 「라인업 만들기」) */
export default function LineupBand() {
  const league = useLeague()
  const { roles } = useLineupBasis()
  const store = useLineupStore()
  const mine = store.status === 'ready' ? store.mine : null
  const totals = mine ? lineupTotals(sanitize(mine, league, roles), league) : null
  const has = Boolean(totals && totals.filled > 0)
  const all = LINEUP_SLOTS.length
  return (
    <section className="lineup-band" aria-label="내 라인업">
      <div className="band-main">
        <span className="band-title"><DiamondIcon size={20} /> 내 라인업</span>
        {has && totals ? (
          <dl className="band-stats">
            <div><dt>총 예상 가치</dt><dd>{formatWon(totals.value)}</dd></div>
            <div><dt>총 WAR</dt><dd>{totals.war.toFixed(2)}</dd></div>
            <div><dt>채운 자리</dt><dd>{all}자리 중 {totals.filled}자리</dd></div>
          </dl>
        ) : (
          <p className="band-empty">
            {store.status === 'ready' && !store.user ? '로그인하면 나만의 라인업을 저장할 수 있어요.' : '아직 저장한 라인업이 없어요. 포지션마다 선수를 골라 보세요.'}
          </p>
        )}
        <p className="band-disclaimer">실제 연봉과 무관합니다.</p>
      </div>
      <Link className="band-btn" to="/lineup">{has ? '라인업 편집' : '라인업 만들기'}</Link>
    </section>
  )
}
