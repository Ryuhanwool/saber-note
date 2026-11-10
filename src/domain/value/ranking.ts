// 선수 가치 순위표: 오늘과 어제의 예상 가치 순위, 순위·금액 변화, 급상승·급하락.
// 가치는 기존 공식(playerValue) 그대로이고, 스탯 조절로 바꾼 값은 넣지 않는다(이 함수들은 리그 기록만 받는다).
import type { League, Player } from '../players'
import { formatWon, playerValue, type ValueBreakdown } from './value'

export type RankGroup = 'all' | 'H' | 'P'
export type RankFilter = { group: RankGroup; team: string | null }
export const ALL_PLAYERS: RankFilter = { group: 'all', team: null }

export type RankRow = {
  player: Player
  /** 1부터 (같은 순위 없음: 동점은 WAR, 이름 순서로 가른다) */
  rank: number
  value: ValueBreakdown
  /** 어제 순위·금액. 어제 순위표에 없던 선수(새로 진입)는 null */
  prev: { rank: number; total: number } | null
  /** 순위 변화: 양수 = 올라감. 새로 진입이면 null */
  rankChange: number | null
  /** 금액 변화(원). 새로 진입이면 null */
  valueChange: number | null
}

/** 순위표에 들어가는 선수: 기간 안에 경기에 나온 선수 */
const played = (p: Player) => (p.type === 'H' ? p.raw.PA > 0 : p.raw.outs > 0)

const inFilter = (p: Player, f: RankFilter) => (f.group === 'all' || p.type === f.group) && (f.team === null || p.team === f.team)

type Entry = { total: number; war: number; name: string }

/** 순위 정렬: 예상 가치 높은 순 → 같으면 WAR 높은 순 → 그것도 같으면 이름순(가나다) */
export function compareEntries(a: Entry, b: Entry): number {
  return b.total - a.total || b.war - a.war || a.name.localeCompare(b.name, 'ko')
}

/** 한 날짜 리그의 순위 (필터 안에서 1위부터) */
export function rankPlayers(league: League, filter: RankFilter = ALL_PLAYERS): { player: Player; value: ValueBreakdown; rank: number }[] {
  return [...league.hitters, ...league.pitchers]
    .filter((p) => played(p) && inFilter(p, filter))
    .map((player) => ({ player, value: playerValue(league, player) }))
    .sort((a, b) => compareEntries(
      { total: a.value.total, war: a.player.m.WAR, name: a.player.name },
      { total: b.value.total, war: b.player.m.WAR, name: b.player.name },
    ))
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

/** 오늘 순위에 어제 순위·금액을 붙인다. yesterday가 null이면(날짜별 기록이 없는 출처) 모두 새로 진입 */
export function valueRanking(today: League, yesterday: League | null, filter: RankFilter = ALL_PLAYERS): RankRow[] {
  const prev = new Map(yesterday ? rankPlayers(yesterday, filter).map((e) => [e.player.id, e]) : [])
  return rankPlayers(today, filter).map(({ player, value, rank }) => {
    const p = prev.get(player.id)
    return {
      player, rank, value,
      prev: p ? { rank: p.rank, total: p.value.total } : null,
      rankChange: p ? p.rank - rank : null,
      valueChange: p ? value.total - p.value.total : null,
    }
  })
}

/** 오늘의 급상승·급하락: 금액이 가장 많이 오른(내린) 선수 n명. 같으면 순위 변화가 큰 쪽, 그다음 순위가 높은 쪽 */
export function movers(rows: RankRow[], n = 3): { up: RankRow[]; down: RankRow[] } {
  const changed = rows.filter((r) => r.valueChange !== null && r.valueChange !== 0)
  const up = changed.filter((r) => r.valueChange! > 0)
    .sort((a, b) => b.valueChange! - a.valueChange! || b.rankChange! - a.rankChange! || a.rank - b.rank)
  const down = changed.filter((r) => r.valueChange! < 0)
    .sort((a, b) => a.valueChange! - b.valueChange! || a.rankChange! - b.rankChange! || a.rank - b.rank)
  return { up: up.slice(0, n), down: down.slice(0, n) }
}

/** 순위 변화 표시: "▲3", "▼2", "–"(변동 없음), "NEW"(새로 진입) */
export function rankChangeLabel(r: Pick<RankRow, 'rankChange'>): string {
  if (r.rankChange === null) return 'NEW'
  if (r.rankChange > 0) return `▲${r.rankChange}`
  if (r.rankChange < 0) return `▼${-r.rankChange}`
  return '–'
}

/** 순위 변화 방향 (화면 색·읽기용 문장) */
export const changeDirection = (n: number | null): 'up' | 'down' | 'same' | 'new' =>
  n === null ? 'new' : n > 0 ? 'up' : n < 0 ? 'down' : 'same'

/** 금액 변화: "+1,200만 원", "−3,000만 원", "+1.2억", 변화 없음 "–", 새로 진입 "NEW" */
export function valueChangeLabel(won: number | null): string {
  if (won === null) return 'NEW'
  if (won === 0) return '–'
  return (won > 0 ? '+' : '') + formatWon(won)
}

/** 순위표 팀 목록 (리그 선수 목록에 나오는 순서) */
export const rankingTeams = (league: League) => [...new Set([...league.hitters, ...league.pitchers].map((p) => p.team))]
