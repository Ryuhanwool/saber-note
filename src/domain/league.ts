import type { PlayerId, RawDataset } from '../data/types'
import { battingStats, leagueWoba } from './metrics/batting'
import { baserunningStats, leagueBaserunning } from './metrics/baserunning'
import { fieldingStats } from './metrics/fielding'
import { leaguePitching, pitchingStats } from './metrics/pitching'
import { hitterWar } from './metrics/war'
import type { HitterPlayer, League, PitcherPlayer, Player } from './players'

/** 원시 데이터셋 → 지표가 계산된 리그 */
export function buildLeague(ds: RawDataset): League {
  const c = ds.constants
  const woba = leagueWoba(ds.hitters, c.woba)
  const run = leagueBaserunning(ds.hitters, c)
  const pit = leaguePitching(ds.pitchers)

  const hitters: HitterPlayer[] = ds.hitters.map((raw) => {
    const bat = battingStats(raw, woba, c)
    const br = baserunningStats(raw, run, c)
    const fld = fieldingStats(raw.fielding)
    const t = raw.tracking
    return {
      type: 'H', id: raw.id, name: raw.name, team: raw.team, raw,
      m: {
        ...bat, ...br, ...fld,
        ev: t.ev, maxev: t.maxev, la: t.la, hard: t.hard, barrel: t.barrel, xba: t.xba, sprint: t.sprint, h2f: t.h2f,
        WAR: hitterWar({ wraa: bat.wraa, uzr: fld.uzr, bsr: br.bsr, PA: raw.PA, pos: raw.pos }, c),
      },
      qualified: raw.PA >= c.qualifiedPA,
    }
  })

  const pitchers: PitcherPlayer[] = ds.pitchers.map((raw) => ({
    type: 'P', id: raw.id, name: raw.name, team: raw.team, raw,
    m: pitchingStats(raw, pit, c),
    // 투수 규정 이닝 기준은 아직 상수에 없다. 데모처럼 전원을 비교 대상으로 둔다
    qualified: true,
  }))

  return {
    meta: ds.meta,
    constants: c,
    totals: { woba, wsbPerOnFirst: run.wsbPerOnFirst, xbt: run.xbt, era: pit.era, cfip: pit.cfip },
    hitters,
    pitchers,
    byId: new Map<PlayerId, Player>([...hitters, ...pitchers].map((p) => [p.id, p])),
    pool: { H: hitters.filter((p) => p.qualified), P: pitchers.filter((p) => p.qualified) },
  }
}
