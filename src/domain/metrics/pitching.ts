import type { LeagueConstants, RawPitcher } from '../../data/types'

const ip = (p: RawPitcher) => p.outs / 3

/** FIP에서 상수를 뺀 부분: 투수가 직접 책임지는 홈런·볼넷·몸에 맞는 공·삼진만 본다 */
export const fipCore = (p: RawPitcher) => (13 * p.HR + 3 * (p.BB + p.HBP) - 2 * p.SO) / ip(p)

export function leaguePitching(pitchers: RawPitcher[]) {
  const sumIP = pitchers.reduce((a, p) => a + ip(p), 0)
  const era = (9 * pitchers.reduce((a, p) => a + p.ER, 0)) / sumIP
  const cfip = era - pitchers.reduce((a, p) => a + fipCore(p) * ip(p), 0) / sumIP
  return { era, cfip }
}

export function pitchingStats(p: RawPitcher, lg: { era: number; cfip: number }, c: LeagueConstants) {
  const IP = ip(p)
  const core = fipCore(p)
  const fip = core + lg.cfip
  return {
    IP,
    era: (9 * p.ER) / IP,
    fip,
    fipCore: core,
    whip: (p.BB + p.H) / IP,
    pk: p.SO / p.TBF,
    pbb: p.BB / p.TBF,
    velo: p.tracking.velo, spin: p.tracking.spin, whiff: p.tracking.whiff,
    WAR: ((lg.era + c.replacementFipGap - fip) * IP) / 9 / c.runsPerWin,
  }
}
