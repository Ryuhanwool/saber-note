import { topPercent } from '../../domain/percentile'

/** 백분위 → 막대 색. 하위 파랑 → 중간 회색 → 상위 빨강 (데모 pctColor와 같은 선형 보간, 색은 tokens.css) */
function percentileColor(pctl: number): string {
  const t = pctl / 100
  return t < 0.5
    ? `color-mix(in srgb, var(--pct-mid) ${t * 2 * 100}%, var(--pct-low))`
    : `color-mix(in srgb, var(--pct-high) ${(t - 0.5) * 2 * 100}%, var(--pct-mid))`
}

export default function PercentileBar({ pctl }: { pctl: number }) {
  const color = percentileColor(pctl)
  const top = topPercent(pctl)
  return (
    <div className="pbar" role="img" aria-label={`리그 상위 ${top}%`}>
      <div className="track">
        <div className="fill" style={{ width: `${pctl}%`, background: color }} />
        <div className="bub" style={{ left: `${pctl}%`, background: color }}>{pctl}</div>
      </div>
      <span className="ptxt">상위 {top}%</span>
    </div>
  )
}
