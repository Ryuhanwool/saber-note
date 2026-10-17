import type { LeagueConstants, RawHitter } from '../../data/types'

/** wOBA 분자: 타격 결과마다 득점 가치를 곱해 더한 값 */
export function wobaNumerator(h: RawHitter, w: LeagueConstants['woba']): number {
  return w.bb * h.BB + w.hbp * h.HBP + w.s1 * h.S1 + w.d2 * h.D2 + w.d3 * h.D3 + w.hr * h.HR
}

/** 리그 wOBA = 전체 타자의 wOBA 분자 합 / 타석 합 */
export function leagueWoba(hitters: RawHitter[], w: LeagueConstants['woba']): number {
  return hitters.reduce((a, h) => a + wobaNumerator(h, w), 0) / hitters.reduce((a, h) => a + h.PA, 0)
}

export function battingStats(h: RawHitter, lgWoba: number, c: LeagueConstants) {
  const AB = h.PA - h.BB - h.HBP
  const H = h.S1 + h.D2 + h.D3 + h.HR
  const avg = H / AB
  const obp = (H + h.BB + h.HBP) / h.PA
  const slg = (h.S1 + 2 * h.D2 + 3 * h.D3 + 4 * h.HR) / AB
  const woba = wobaNumerator(h, c.woba) / h.PA
  const wraa = ((woba - lgWoba) / c.wobaScale) * h.PA
  const wrcp = ((wraa / h.PA + c.runsPerPA) / c.runsPerPA) * 100
  const bipAB = AB - h.SO - h.HR
  return {
    avg, obp, slg, ops: obp + slg, woba, wraa, wrcp,
    babip: bipAB > 0 ? (H - h.HR) / bipAB : null,
    bbp: h.BB / h.PA,
    kp: h.SO / h.PA,
    hr: h.HR,
  }
}
