// 게임 2. 블라인드 스탯 퀴즈: 이름을 가린 지표 카드의 주인공을 보기 4개 중에서 맞힌다.
// 틀릴 때마다 힌트(포지션 → 팀 → 나이)가 하나씩 열리고, 3번 틀리면 끝난다.
import type { PlayerId } from '../../data/types'
import type { MetricKey } from '../catalog'
import type { HitterPlayer } from '../players'
import { pick, seededRandom, shuffle, type Rand } from '../random'

export const BLIND_STATS: MetricKey[] = ['WAR', 'wrcp', 'ops', 'hr', 'drs', 'sb', 'sprint']
export const BLIND_OPTIONS = 4
export const BLIND_MAX_WRONG = 3

export type Blind = {
  target: HitterPlayer
  options: HitterPlayer[]
  wrong: PlayerId[]
  done: boolean
  won: boolean
}

export function startBlind(pool: readonly HitterPlayer[], rand: Rand): Blind | null {
  if (pool.length < BLIND_OPTIONS) return null
  const target = pick(pool, rand)
  const decoys = shuffle(pool.filter((p) => p !== target), rand).slice(0, BLIND_OPTIONS - 1)
  return { target, options: shuffle([target, ...decoys], rand), wrong: [], done: false, won: false }
}

/** 오늘의 문제: 같은 날에는 모두 같은 문제 (dayKey = "YYYY-MM-DD") */
export const dailyBlind = (pool: readonly HitterPlayer[], dayKey: string) => startBlind(pool, seededRandom(`blind:${dayKey}`))

export function guessBlind(s: Blind, id: PlayerId): Blind {
  if (s.done || s.wrong.includes(id)) return s
  if (id === s.target.id) return { ...s, done: true, won: true }
  const wrong = [...s.wrong, id]
  return { ...s, wrong, done: wrong.length >= BLIND_MAX_WRONG, won: false }
}

/** 열린 힌트 수: 틀린 횟수만큼, 끝나면 전부 */
export const blindHintsShown = (s: Blind, total: number) => (s.done ? total : Math.min(total, s.wrong.length))
