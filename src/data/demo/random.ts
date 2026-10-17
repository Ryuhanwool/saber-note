// 데모 가상 리그용 시드 난수. 데모 HTML과 같은 값을 내야 하므로 식을 바꾸지 않는다.

export type Rand = () => number

export function mulberry32(seed: number): Rand {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 표준정규분포 (Box–Muller) */
export function gaussian(rand: Rand): number {
  let u = 0
  let v = 0
  while (!u) u = rand()
  while (!v) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))

export const pick = <T>(arr: readonly T[], rand: Rand): T => arr[Math.floor(rand() * arr.length)]
