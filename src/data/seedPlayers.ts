// 예시 글(커뮤니티·응원방·마켓)에 태그할 선수 고르기.
// 가상 리그 기록은 날마다 바뀌므로(최근 144경기) 홈런·도루·탈삼진 「1위」는 날짜에 따라 달라진다.
// 예시 글이 날짜를 옮겨도 같은 선수·같은 문장이 되도록, 날짜별로 바뀌지 않는 시즌 트래킹 값으로 고른다.
// 트래킹 값이 없는 출처는 기록 비율로 고른다.
import type { RawHitter, RawPitcher } from './types'

const best = <T>(xs: readonly T[], score: (x: T) => number, skip: readonly T[] = []): T | undefined =>
  xs.filter((x) => !skip.includes(x)).reduce<T | undefined>((b, x) => (b === undefined || score(x) > score(b) ? x : b), undefined)

/** 장타력: 배럴 비율 (없으면 타석당 홈런) */
const power = (h: RawHitter) => h.tracking.barrel ?? h.HR / Math.max(1, h.PA)
/** 발: 스프린트 스피드 (없으면 1루 출루당 도루) */
const speed = (h: RawHitter) => h.tracking.sprint ?? h.SB / Math.max(1, h.S1 + h.BB + h.HBP)
/** 삼진 능력: 헛스윙 비율 (없으면 상대 타자당 탈삼진) */
const strikeouts = (p: RawPitcher) => p.tracking.whiff ?? p.SO / Math.max(1, p.TBF)

export type SeedStars = {
  /** 장타자 두 명 */
  sluggers: RawHitter[]
  /** 발 빠른 타자 (장타자 두 명 제외) */
  runner: RawHitter | undefined
  /** 삼진을 잘 잡는 선발 투수 (선발이 없으면 아무 투수) */
  ace: RawPitcher | undefined
  /** 삼진을 잘 잡는 불펜 투수 (에이스 제외) */
  closer: RawPitcher | undefined
}

export function seedStars(league: { hitters: readonly RawHitter[]; pitchers: readonly RawPitcher[] }): SeedStars {
  const s1 = best(league.hitters, power)
  const s2 = s1 ? best(league.hitters, power, [s1]) : undefined
  const sluggers = [s1, s2].filter((x): x is RawHitter => x !== undefined)
  const ace = best(league.pitchers.filter((p) => p.role === 'SP'), strikeouts) ?? best(league.pitchers, strikeouts)
  return {
    sluggers,
    runner: best(league.hitters, speed, sluggers),
    ace,
    closer: best(league.pitchers.filter((p) => p.role === 'RP'), strikeouts, ace ? [ace] : []),
  }
}
