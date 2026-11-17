import { useMemo } from 'react'
import { ballFlight, fenceDistance, flightPoint, FENCE_HEIGHT_M, FOUL_LINE_DEG, type FlightInput } from '../../domain/games/ballFlight'

// 타구 애니메이션 그림 두 개(옆에서 본 궤적 · 위에서 본 야구장). 진행도(0~1)와 타구 속도·발사각·방향만으로 그린다 —
// 결과(안타·아웃)는 받지 않아 정답이 미리 드러나지 않는다. 외부 라이브러리 없이 SVG.

type Fielder = 'C' | '1B' | '2B' | 'SS' | '3B' | 'LF' | 'CF' | 'RF'

/** 수비 위치 (m, x 오른쪽 +, y 중견수 쪽 +) */
const FIELDER_M: Record<Fielder, [number, number]> = {
  C: [0, -5], '1B': [19, 25], '2B': [11, 38], SS: [-11, 38], '3B': [-19, 25], LF: [-52, 78], CF: [0, 98], RF: [52, 78],
}

// 옆에서 본 그림: 240 × 150, 땅 y=130, 홈 x=14, 1m = 1.3px
const SIDE = { w: 240, h: 150, ground: 130, home: 14, s: 1.3 }
// 위에서 본 그림: 200 × 186, 홈 (100, 170), 1m = 0.95px
const TOP = { w: 200, h: 186, hx: 100, hy: 170, s: 0.95 }
const TRAIL_STEPS = 32

const sx = (d: number) => SIDE.home + d * SIDE.s
const sy = (h: number) => Math.max(6, SIDE.ground - h * SIDE.s)
const tx = (x: number) => TOP.hx + x * TOP.s
const ty = (y: number) => Math.max(4, TOP.hy - y * TOP.s)
const f1 = (n: number) => n.toFixed(1)

/** 위에서 본 담장 호 (파울 라인 끝 → 가운데 → 반대쪽 끝) */
const FENCE_ARC = Array.from({ length: 19 }, (_, i) => -FOUL_LINE_DEG + (i * 2 * FOUL_LINE_DEG) / 18)
  .map((deg) => {
    const r = (deg * Math.PI) / 180
    const d = fenceDistance(deg)
    return `${f1(tx(Math.sin(r) * d))} ${f1(ty(Math.cos(r) * d))}`
  })
  .join(' L')

const at = (deg: number, d: number) => [tx(Math.sin((deg * Math.PI) / 180) * d), ty(Math.cos((deg * Math.PI) / 180) * d)] as const

type Props = {
  ball: FlightInput
  fielderPos: Fielder
  /** 0(홈) ~ 1(멈춘 곳) */
  progress: number
  /** 화면 읽기 프로그램용 타구 설명 (결과는 넣지 않는다) */
  label: { side: string; top: string }
}

/** 옆에서 본 궤적 + 위에서 본 야구장. 같은 타구·같은 진행도면 결과와 상관없이 같은 그림 */
export default function BallFlightView({ ball, fielderPos, progress, label }: Props) {
  const { ev, la, deg } = ball
  const flight = useMemo(() => ballFlight({ ev, la, deg }), [ev, la, deg])
  const f = { ...flight, deg }
  const p = flightPoint(f, progress)
  const done = progress >= 1
  const trail = Array.from({ length: Math.ceil(TRAIL_STEPS * progress) + 1 }, (_, i) => flightPoint(f, Math.min(progress, i / TRAIL_STEPS)))
  const fenceX = sx(flight.fence)
  // 위에서 본 공: 높이 뜰수록 조금 크게, 그림자는 땅 위 위치
  const [gx, gy] = [tx(p.x), ty(p.y)]
  const lift = Math.min(p.h, 40) * 0.35
  const r = 3.4 + Math.min(p.h, 40) * 0.05
  const end = flight.end
  const mark = [tx(end.x), ty(end.y)]
  const [fx, fy] = FIELDER_M[fielderPos]
  const [lineL, lineR] = [at(-FOUL_LINE_DEG, 100), at(FOUL_LINE_DEG, 100)]
  const [b1, b2, b3] = [[tx(19.4), ty(19.4)], [tx(0), ty(38.8)], [tx(-19.4), ty(19.4)]]

  return (
    <div className="bbflight" data-progress={progress.toFixed(3)}>
      <figure className="bbfig">
      <svg viewBox={`0 0 ${SIDE.w} ${SIDE.h}`} className="bbside" role="img" aria-label={label.side}>
        <rect x="0" y={SIDE.ground} width={SIDE.w} height={SIDE.h - SIDE.ground} fill="var(--grass)" />
        <line x1="0" x2={SIDE.w} y1={SIDE.ground} y2={SIDE.ground} stroke="var(--line)" strokeWidth="1.5" />
        {/* 담장: 실제(4m)보다 조금 높게 그려 잘 보이게 */}
        <rect x={f1(fenceX)} y={f1(SIDE.ground - FENCE_HEIGHT_M * SIDE.s * 2)} width="4" height={f1(FENCE_HEIGHT_M * SIDE.s * 2)} fill="var(--ink)" />
        <text x={f1(fenceX + 2)} y={f1(SIDE.ground - FENCE_HEIGHT_M * SIDE.s * 2 - 4)} textAnchor="middle" fontSize="8" fill="var(--soft)">담장 {Math.round(flight.fence)}m</text>
        <path d={`M${SIDE.home - 4} ${SIDE.ground} h8`} stroke="var(--ink)" strokeWidth="3" />
        <polyline points={trail.map((q) => `${f1(sx(q.d))},${f1(sy(q.h))}`).join(' ')} fill="none" stroke="var(--seam)" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
        {done && <path d={`M${f1(sx(end.d) - 4)} ${SIDE.ground - 4} l8 8 M${f1(sx(end.d) + 4)} ${SIDE.ground - 4} l-8 8`} stroke="var(--ball-edge)" strokeWidth="2" strokeLinecap="round" data-mark="side" />}
        <circle className="bb-ball" cx={f1(sx(p.d))} cy={f1(sy(p.h) - 3)} r="4" fill="var(--ball)" stroke="var(--ball-edge)" strokeWidth="1.6" data-d={p.d.toFixed(2)} data-h={p.h.toFixed(2)} />
      </svg>
      <figcaption>옆에서 본 궤적</figcaption>
      </figure>
      <figure className="bbfig">
      <svg viewBox={`0 0 ${TOP.w} ${TOP.h}`} className="bbtop" role="img" aria-label={label.top}>
        <path d={`M${TOP.hx} ${TOP.hy} L${FENCE_ARC} Z`} fill="var(--grass)" />
        <path d={`M${TOP.hx} ${TOP.hy} L${f1(at(-FOUL_LINE_DEG, 30)[0])} ${f1(at(-FOUL_LINE_DEG, 30)[1])} Q${TOP.hx} ${f1(ty(52))} ${f1(at(FOUL_LINE_DEG, 30)[0])} ${f1(at(FOUL_LINE_DEG, 30)[1])} Z`} fill="var(--dirt)" />
        <path d={`M${TOP.hx} ${TOP.hy} L${f1(lineL[0])} ${f1(lineL[1])} M${TOP.hx} ${TOP.hy} L${f1(lineR[0])} ${f1(lineR[1])}`} stroke="var(--chalk)" strokeWidth="1.2" />
        <path d={`M${FENCE_ARC}`} fill="none" stroke="var(--ink)" strokeWidth="2.5" />
        {[b1, b2, b3].map(([x, y], i) => <rect key={i} x={f1(x - 2.5)} y={f1(y - 2.5)} width="5" height="5" fill="var(--chalk)" transform={`rotate(45 ${f1(x)} ${f1(y)})`} />)}
        <line x1={TOP.hx} y1={TOP.hy} x2={f1(gx)} y2={f1(gy)} stroke="var(--seam)" strokeWidth="2" strokeDasharray={flight.kind === 'ground' ? undefined : '4 3'} strokeLinecap="round" />
        <circle cx={f1(tx(fx))} cy={f1(ty(fy))} r="8" fill="var(--ink)" />
        <text x={f1(tx(fx))} y={f1(ty(fy) + 3)} textAnchor="middle" fontSize="8" fill="var(--paper)" fontWeight="700">{fielderPos}</text>
        {done && (
          <g data-mark="top">
            <circle cx={f1(mark[0])} cy={f1(mark[1])} r="6" fill="none" stroke="var(--ball)" strokeWidth="2" />
            <circle cx={f1(mark[0])} cy={f1(mark[1])} r="6" fill="none" stroke="var(--ball-edge)" strokeWidth="1" strokeDasharray="2 2" />
          </g>
        )}
        {p.h > 0.3 && <ellipse cx={f1(gx)} cy={f1(gy)} rx={f1(r * 0.8)} ry={f1(r * 0.45)} fill="var(--ball-edge)" opacity=".35" />}
        <circle className="bb-ball" cx={f1(gx)} cy={f1(gy - lift)} r={f1(r)} fill="var(--ball)" stroke="var(--ball-edge)" strokeWidth="1.6" data-x={p.x.toFixed(2)} data-y={p.y.toFixed(2)} />
        <circle cx={TOP.hx} cy={TOP.hy} r="3" fill="var(--chalk)" />
      </svg>
      <figcaption>위에서 본 야구장</figcaption>
      </figure>
    </div>
  )
}
