import { useSearchParams } from 'react-router'
import type { PlayerId } from '../../data/types'
import { metricAvailable } from '../../domain/availability'
import { metricDef } from '../../domain/catalog'
import { comparePlayers, type CompareRow } from '../../domain/compare'
import { formatMetric } from '../../domain/format'
import type { Player } from '../../domain/players'
import { formatWon, playerValue } from '../../domain/value/value'
import { useLeague } from '../shared/LeagueContext'
import { positionLabel } from '../shared/labels'
import './compare.css'

function PlayerSelect({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const league = useLeague()
  const option = (p: Player) => <option key={p.id} value={p.id}>{p.name} ({p.team}, {positionLabel(p)})</option>
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">선수 선택</option>
        <optgroup label="타자">{league.hitters.map(option)}</optgroup>
        <optgroup label="투수">{league.pitchers.map(option)}</optgroup>
      </select>
    </div>
  )
}

function CompareTable({ A, B }: { A: Player; B: Player }) {
  const league = useLeague()
  // 데이터 출처에 없는 지표는 비교 줄에서 뺀다
  const result = comparePlayers(A, B, (k) => metricAvailable(league, k))
  if (!result.ok) {
    return (
      <p className="empty">
        {result.reason === 'type-mismatch'
          ? '타자는 타자끼리, 투수는 투수끼리 비교할 수 있어요. 한 선수를 다시 골라 주세요.'
          : '서로 다른 두 선수를 골라 주세요.'}
      </p>
    )
  }
  const { rows, wins, leader } = result
  const name = (side: 'a' | 'b') => (side === 'a' ? A.name : B.name)
  const lead = leader
    ? `지표 ${rows.length}개 중 ${name(leader)} 선수가 ${wins[leader]}개 우세해요.`
    : `지표 ${rows.length}개 중 두 선수가 ${wins.a}개씩 앞서요.`
  const reason = (r: CompareRow) => `${metricDef(r.key).label} ${formatMetric(r.key, r.a)} 대 ${formatMetric(r.key, r.b)}: ${name(r.winner!)}`
  const reasons = rows.filter((r) => r.winner).map(reason)
  // 예상 가치 줄: 앞서는 쪽은 표시하지만 우세 지표 수에는 넣지 않는다 (WAR와 겹쳐 두 번 세게 되므로)
  const valueA = playerValue(league, A).total, valueB = playerValue(league, B).total

  return (
    <>
      <table className="ctable">
        <thead>
          <tr><th className="display">{A.name}</th><th></th><th className="display">{B.name}</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className={r.winner === 'a' ? 'win' : ''}>{formatMetric(r.key, r.a)}</td>
              <th scope="row">{metricDef(r.key).label}</th>
              <td className={r.winner === 'b' ? 'win' : ''}>{formatMetric(r.key, r.b)}</td>
            </tr>
          ))}
          <tr className="value-row">
            <td className={valueA > valueB ? 'win' : ''}>{formatWon(valueA)}</td>
            <th scope="row">예상 가치</th>
            <td className={valueB > valueA ? 'win' : ''}>{formatWon(valueB)}</td>
          </tr>
        </tbody>
      </table>
      <p className="muted value-row-note">
        예상 가치는 WAR와 클러치로 계산한 재미용 금액이에요. <b>실제 연봉과 무관합니다.</b> WAR와 겹치므로 우세 지표 수에는 넣지 않아요.
      </p>
      <div className="summary">
        <b>{lead}</b>
        <div className="muted" style={{ fontSize: '.9rem', marginTop: 6 }}>
          근거: {reasons.length ? reasons.join(' / ') : '앞서는 지표가 없어요'}
        </div>
      </div>
    </>
  )
}

/** 화면 3. 선수 2명 비교 — 선택한 선수는 주소(?a=…&b=…)에 남는다 */
export default function ComparePage() {
  const league = useLeague()
  const [params, setParams] = useSearchParams()
  const a = params.get('a') ?? ''
  const b = params.get('b') ?? ''
  const A = league.byId.get(a as PlayerId)
  const B = league.byId.get(b as PlayerId)

  const set = (key: 'a' | 'b', v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(key, v)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="panel">
      <h1 className="display" style={{ margin: '0 0 16px', fontSize: '2rem' }}>선수 2명 비교</h1>
      <div className="cmp-pick">
        <PlayerSelect id="ca" label="왼쪽 선수" value={A ? a : ''} onChange={(v) => set('a', v)} />
        <div className="vs display">VS</div>
        <PlayerSelect id="cb" label="오른쪽 선수" value={B ? b : ''} onChange={(v) => set('b', v)} />
      </div>
      {A && B ? <CompareTable A={A} B={B} /> : <p className="empty">두 선수를 고르면 같은 지표를 나란히 비교해 드려요.</p>}
      <p className="muted" style={{ fontSize: '.85rem', margin: '14px 0 0' }}>
        ▲ 표시와 빨간 숫자가 그 지표에서 앞서는 쪽이에요. ERA, FIP, WHIP, 삼진 비율, 볼넷 허용 비율은 낮을수록 앞섭니다.
      </p>
    </div>
  )
}
