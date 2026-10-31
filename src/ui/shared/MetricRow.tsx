import { useId } from 'react'
import { metricDef, type MetricKey } from '../../domain/catalog'
import { formatMetric } from '../../domain/format'
import { leagueAverage, metricValue, percentile } from '../../domain/percentile'
import type { Player } from '../../domain/players'
import { useLeague } from './LeagueContext'
import PercentileBar from './PercentileBar'
import './metric.css'

type Props = { player: Player; metricKey: MetricKey; open: boolean; onToggle: () => void }

/** 지표 한 줄: 이름(ⓘ 설명) · 값 · 리그 평균 대비 백분위 막대 */
export default function MetricRow({ player, metricKey: k, open, onToggle }: Props) {
  const league = useLeague()
  const explainId = useId()
  const def = metricDef(k)
  const value = metricValue(player, k)
  const avg = formatMetric(k, leagueAverage(league, player.type, k))

  let bar
  if (def.better === null) bar = <div className="neutral">리그 평균 {avg}와 비교해 보세요</div>
  else if (value === null) bar = <div className="neutral">{def.emptyText ?? '기록이 없어요'}</div>
  else {
    const pctl = percentile(league, player, k)
    bar = pctl === null ? <div className="neutral">비교할 기록이 없어요</div> : <PercentileBar pctl={pctl} />
  }

  return (
    <div className="metric">
      <button className="mname" aria-expanded={open} aria-controls={open ? explainId : undefined} onClick={onToggle}>
        <span>{def.label}</span>
        <span className="i" aria-hidden="true">i</span>
      </button>
      <div className="mval">{formatMetric(k, value)}</div>
      {bar}
      {open && (
        <div className="explain" id={explainId}>
          <p>{def.desc}</p>
          <p className="muted">기준: {def.scale}. 리그 평균 {avg}</p>
        </div>
      )}
    </div>
  )
}
