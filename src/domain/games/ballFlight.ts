// 게임 4 「이 타구, 안타일까?」 타구 애니메이션 경로.
// 타구 속도·발사각·방향(각도)만으로 정한다 — 결과(안타·아웃)는 받지 않으므로, 같은 타구는 결과가 달라도 똑같이 날아간다.
// 데모용 간이 모델: 공기 저항 없는 포물선 거리에 발사각별 감속 계수를 곱하고, 땅볼은 낮게 튀며 굴러간다.

/** 경로에 필요한 것: 타구 속도(km/h)·발사각(°)·방향 각도(°, 0 = 가운데, 음수 = 좌측) */
export type FlightInput = { ev: number; la: number; deg: number }

export type FlightKind = 'ground' | 'line' | 'fly' | 'popup'

/** 한 장면: d = 홈에서 땅 위로 잰 거리(m), h = 높이(m), x·y = 위에서 본 위치(m, x는 오른쪽 +, y는 중견수 쪽 +) */
export type FlightPoint = { d: number; h: number; x: number; y: number }

export type Flight = {
  kind: FlightKind
  /** 멈추는(떨어지는·굴러가 멈추는) 곳까지 거리 (m) */
  distance: number
  /** 가장 높은 곳 (m) */
  apex: number
  /** 이 방향의 담장까지 거리 (m) */
  fence: number
  /** 담장을 넘는지 (타구 속도·발사각으로 정해지는 홈런 구간) */
  overFence: boolean
  /** 애니메이션 길이 (ms, 1.5~2.5초) */
  durationMs: number
  /** 마지막 장면 (공이 멈춘 곳) */
  end: FlightPoint
  /** 첫 땅 닿는 곳 (위에서 본 그림의 표시) */
  landing: FlightPoint
}

const G = 9.8
/** 담장: 좌우 끝 100m, 가운데 122m */
export const FENCE_LINE_M = 100
export const FENCE_CENTER_M = 122
/** 담장 높이 (옆에서 본 그림) */
export const FENCE_HEIGHT_M = 4
/** 가운데에서 좌우 끝(파울 라인)까지 각도 */
export const FOUL_LINE_DEG = 45

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))

/** 그 방향의 담장 거리 (가운데 122m → 파울 라인 100m) */
export const fenceDistance = (deg: number) => FENCE_CENTER_M - (FENCE_CENTER_M - FENCE_LINE_M) * clamp(Math.abs(deg) / FOUL_LINE_DEG, 0, 1)

/** 담장을 넘는 타구: battedBall.ts의 홈런 구간과 같은 기준 (타구 속도·발사각만) */
export const isOverFence = (ev: number, la: number) => ev >= 158 && la >= 22 && la <= 35

export function flightKind(la: number): FlightKind {
  if (la < 10) return 'ground'
  if (la > 50) return 'popup'
  return la > 25 ? 'fly' : 'line'
}

/** 발사각이 높을수록 공기 저항으로 덜 날아간다 (데모 감속 계수) */
const carryFactor = (la: number) => (la <= 30 ? 0.72 : 0.72 - (0.27 * Math.min(la - 30, 40)) / 40)

/** 땅볼이 튀는 구간: 거리 비율과 높이 비율 (점점 낮고 짧게). 나머지 28%는 굴러간다 */
const HOPS = [
  { len: 0.32, h: 1 },
  { len: 0.24, h: 0.45 },
  { len: 0.16, h: 0.18 },
] as const

export function ballFlight({ ev, la, deg }: FlightInput): Flight {
  const v = ev / 3.6
  const kind = flightKind(la)
  const fence = fenceDistance(deg)
  const overFence = isOverFence(ev, la)
  let distance: number
  let apex: number
  let landing: number
  if (kind === 'ground') {
    // 땅볼: 빠를수록 멀리 굴러간다 (내야를 지나 외야 잔디까지). 첫 튐 높이는 발사각이 낮을수록(땅에 꽂힐수록) 낮다
    distance = 18 + clamp((ev - 95) / 90, 0, 1) * 52
    apex = 0.4 + clamp((la + 25) / 35, 0, 1) * 1.8
    landing = distance * HOPS[0].len
  } else {
    const rad = (la * Math.PI) / 180
    distance = ((v * v * Math.sin(2 * rad)) / G) * carryFactor(la)
    apex = ((v * v * Math.sin(rad) ** 2) / (2 * G)) * 0.8
    // 홈런 구간은 담장 너머로, 그 밖의 타구는 담장 앞(경고 구역)까지만
    if (overFence) distance = Math.max(distance, fence + 8)
    else distance = Math.min(distance, fence - 4)
    landing = distance
  }
  const durationMs = Math.round(clamp(1500 + (distance / 140) * 1000, 1500, 2500))
  const at = (t: number) => flightPoint({ kind, distance, apex, deg }, t)
  return { kind, distance, apex, fence, overFence, durationMs, end: at(1), landing: { ...at(1), d: landing, h: 0, ...toXY(landing, deg) } }
}

const toXY = (d: number, deg: number) => {
  const r = (deg * Math.PI) / 180
  return { x: Math.sin(r) * d, y: Math.cos(r) * d }
}

/** t(0~1) 시점의 공 위치. 뜬 타구는 포물선, 땅볼은 튀다가 굴러간다 */
export function flightPoint(f: Pick<Flight, 'kind' | 'distance' | 'apex'> & { deg: number }, t: number): FlightPoint {
  const tt = clamp(t, 0, 1)
  let d: number, h: number
  if (f.kind === 'ground') {
    // 거리는 점점 느려지게 (굴러가며 멈춘다)
    const s = 1 - (1 - tt) ** 2
    d = f.distance * s
    h = 0
    let from = 0
    for (const hop of HOPS) {
      const to = from + hop.len
      if (s < to) {
        const u = (s - from) / hop.len
        h = 4 * f.apex * hop.h * u * (1 - u)
        break
      }
      from = to
    }
  } else {
    d = f.distance * tt
    h = 4 * f.apex * tt * (1 - tt)
  }
  return { d, h, ...toXY(d, f.deg) }
}

/** 애니메이션 장면 목록 (테스트·미리 계산용): steps+1개, 처음은 홈, 마지막은 멈춘 곳 */
export function flightPath(input: FlightInput, steps = 40): FlightPoint[] {
  const f = ballFlight(input)
  return Array.from({ length: steps + 1 }, (_, i) => flightPoint({ ...f, deg: input.deg }, i / steps))
}
