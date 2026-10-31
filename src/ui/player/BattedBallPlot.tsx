import type { PlayerId } from '../../data/types'
import { useBattedBalls } from './useBattedBalls'

// 그래프 범위: 타구 속도 90~190 km/h, 발사각 -35~70° (데모와 같은 좌표)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const x = (ev: number) => 20 + ((clamp(ev, 90, 190) - 90) / 100) * 290
const y = (la: number) => 180 - ((clamp(la, -35, 70) + 35) / 105) * 165

/** 타구 속도 × 발사각 점그래프 (빨간 점: 안타, 빈 원: 아웃) */
export default function BattedBallPlot({ playerId }: { playerId: PlayerId }) {
  const balls = useBattedBalls(playerId, true)

  return (
    <>
      <h2 style={{ marginTop: 20 }}>타구 분포</h2>
      {balls === null ? (
        <p className="muted">타구 기록을 불러오는 중이에요…</p>
      ) : balls.length === 0 ? (
        <p className="muted">타구 기록이 없어요.</p>
      ) : (
        <>
          <svg viewBox="0 0 330 200" width="100%" style={{ maxWidth: 520 }} role="img" aria-label={`타구 속도와 발사각 분포 (타구 ${balls.length}개)`}>
            <rect x="20" y="15" width="290" height="165" fill="none" stroke="var(--line)" />
            <rect x={x(150)} y={y(32)} width={x(190) - x(150)} height={y(8) - y(32)} fill="var(--seam)" opacity=".08" />
            <line x1="20" x2="310" y1={y(0)} y2={y(0)} stroke="var(--line)" strokeDasharray="3 3" />
            {balls.map((b, i) =>
              b.hit ? (
                <circle key={i} data-hit="true" cx={x(b.ev).toFixed(1)} cy={y(b.la).toFixed(1)} r="4" fill="var(--seam)" />
              ) : (
                <circle key={i} data-hit="false" cx={x(b.ev).toFixed(1)} cy={y(b.la).toFixed(1)} r="3.5" fill="none" stroke="var(--soft)" />
              ),
            )}
            <text x="165" y="197" textAnchor="middle" fontSize="10" fill="var(--soft)">타구 속도 (90 → 190 km/h)</text>
            <text x="10" y="100" fontSize="10" fill="var(--soft)" transform="rotate(-90 10 100)" textAnchor="middle">발사각</text>
          </svg>
          <div className="legend">
            <span><i className="sw" style={{ background: 'var(--seam)' }} />안타</span>
            <span><i className="sw" style={{ border: '1px solid var(--soft)' }} />아웃</span>
            <span>옅은 빨간 영역: 빠르고 적당히 뜬 이상적인 타구 구간</span>
          </div>
        </>
      )}
    </>
  )
}
