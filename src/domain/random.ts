// 게임용 난수 도구. 게임 규칙은 난수 함수를 인자로 받아서, 테스트에서는 정해진 값을 넣을 수 있다.
// (data/demo/random.ts와 같은 mulberry32지만, domain은 data 어댑터를 import할 수 없어서 따로 둔다.
//  데모 선수 생성용 난수는 값이 바뀌면 안 되므로 그쪽은 건드리지 않는다.)

export type Rand = () => number

function mulberry32(seed: number): Rand {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 같은 문자열이면 언제나 같은 난수열 (예: 날짜별 "오늘의 문제") */
export function seededRandom(key: string): Rand {
  let h = 0x811c9dc5 // FNV-1a
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return mulberry32(h >>> 0)
}

export const pick = <T>(arr: readonly T[], rand: Rand): T => arr[Math.floor(rand() * arr.length)]

/** 고르게 섞기 (Fisher–Yates). 원래 배열은 바꾸지 않는다 */
export function shuffle<T>(arr: readonly T[], rand: Rand): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
