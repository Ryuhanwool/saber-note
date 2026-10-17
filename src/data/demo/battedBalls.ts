import type { RawBattedBall, RawHitterTracking } from '../types'
import { clamp, gaussian, mulberry32 } from './random'

// 가상 타구의 안타 여부를 정하는 "진짜" 확률 곡선. 실제 출처라면 안타·아웃 결과가 그대로 온다.
// domain의 기대 타율 추정 모델과는 역할이 다르므로 일부러 따로 둔다.
function hitProbability(ev: number, la: number): number {
  let p: number
  if (la < -10) p = 0.1 + ((ev - 120) / 60) * 0.25
  else if (la < 8) p = 0.18 + ((ev - 110) / 70) * 0.45
  else if (la <= 32) p = 0.3 + ((ev - 110) / 60) * 0.62
  else if (la <= 50) p = ev > 160 ? 0.45 : 0.05 + ((ev - 110) / 50) * 0.25
  else p = 0.02
  if (ev >= 158 && la >= 22 && la <= 35) p = Math.max(p, 0.9)
  return clamp(p, 0.01, 0.97)
}

/** 선수 번호마다 고정 시드로 40개 타구를 만든다 (데모와 같은 값) */
export function demoBattedBalls(num: number, tracking: Pick<RawHitterTracking, 'ev' | 'la'>): RawBattedBall[] {
  if (tracking.ev === null || tracking.la === null) return []
  const r = mulberry32(num * 977 + 3)
  const out: RawBattedBall[] = []
  for (let i = 0; i < 40; i++) {
    const ev = clamp(tracking.ev + gaussian(r) * 13, 90, 190)
    const la = clamp(tracking.la + gaussian(r) * 22, -35, 70)
    out.push({ ev, la, hit: r() < hitProbability(ev, la) })
  }
  return out
}
