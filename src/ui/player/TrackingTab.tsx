import type { ReactNode } from 'react'
import { availableKeys } from '../../domain/availability'
import type { MetricKey } from '../../domain/catalog'
import type { Player } from '../../domain/players'
import { useLeague } from '../shared/LeagueContext'
import BattedBallPlot from './BattedBallPlot'
import SourceNote from './SourceNote'
import { HITTER_TRACKING, PITCHER_TRACKING } from './tabs'

type Props = { player: Player; rows: (keys: MetricKey[]) => ReactNode }

/** 트래킹 탭: 타자는 타구 지표 + 타구 분포, 투수는 구속·회전수·헛스윙 + 구종 비율 (출처가 주는 것만) */
export default function TrackingTab({ player: p, rows }: Props) {
  const league = useLeague()
  const a = league.meta.available
  const keys = availableKeys(league, p.type === 'H' ? HITTER_TRACKING : PITCHER_TRACKING)
  const mix = p.type === 'P' && a.pitcherTracking.mix ? p.raw.tracking.mix : null

  return (
    <>
      {rows(keys)}
      {p.type === 'H' && a.battedBalls && <BattedBallPlot playerId={p.id} />}
      {mix && mix.length > 0 && (
        <>
          <h2 style={{ marginTop: 20 }}>구종 비율</h2>
          {mix.map(({ pitch, share }) => (
            <div key={pitch} className="mix">
              <span>{pitch}</span>
              <div className="track"><div className="fill" style={{ width: `${share * 100}%`, background: 'var(--ink)' }} /></div>
              <span>{(share * 100).toFixed(0)}%</span>
            </div>
          ))}
        </>
      )}
      <p className="muted" style={{ fontSize: '.85rem', margin: '16px 0 0' }}>
        트래킹 지표는 데이터를 확보한 경우에만 보여 줍니다. 막대 색은 빨강일수록 리그 상위, 파랑일수록 하위예요.
      </p>
      <SourceNote />
    </>
  )
}
