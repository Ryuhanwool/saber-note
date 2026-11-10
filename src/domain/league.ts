import type { LeagueConstants, PlayerId, RawDataset, RawHitter, RawPitcher } from '../data/types'
import { battingStats, leagueWoba } from './metrics/batting'
import { baserunningStats, leagueBaserunning } from './metrics/baserunning'
import { fieldingStats } from './metrics/fielding'
import { leaguePitching, pitchingStats } from './metrics/pitching'
import { hitterWar } from './metrics/war'
import type { HitterMetrics, HitterPlayer, League, LeagueTotals, PitcherMetrics, PitcherPlayer, Player } from './players'

/** 타자 한 명의 지표 (리그 기준값은 받아서 쓴다 — 스탯 조절에서도 같은 공식을 쓴다) */
export function hitterMetrics(raw: RawHitter, t: LeagueTotals, c: LeagueConstants): HitterMetrics {
  const bat = battingStats(raw, t.woba, c)
  const br = baserunningStats(raw, t, c)
  const fld = fieldingStats(raw.fielding)
  const tr = raw.tracking
  return {
    ...bat, ...br, ...fld,
    ev: tr.ev, maxev: tr.maxev, la: tr.la, hard: tr.hard, barrel: tr.barrel, xba: tr.xba, sprint: tr.sprint, h2f: tr.h2f,
    WAR: hitterWar({ wraa: bat.wraa, uzr: fld.uzr, bsr: br.bsr, PA: raw.PA, pos: raw.pos }, c),
  }
}

/** 투수 한 명의 지표 */
export const pitcherMetrics = (raw: RawPitcher, t: LeagueTotals, c: LeagueConstants): PitcherMetrics => pitchingStats(raw, t, c)

/** 원시 데이터셋 → 지표가 계산된 리그 */
export function buildLeague(ds: RawDataset): League {
  const c = ds.constants
  const woba = leagueWoba(ds.hitters, c.woba)
  const run = leagueBaserunning(ds.hitters, c)
  const pit = leaguePitching(ds.pitchers)
  const totals: LeagueTotals = { woba, wsbPerOnFirst: run.wsbPerOnFirst, xbt: run.xbt, era: pit.era, cfip: pit.cfip }

  const hitters: HitterPlayer[] = ds.hitters.map((raw) => ({
    type: 'H', id: raw.id, name: raw.name, team: raw.team, raw,
    m: hitterMetrics(raw, totals, c),
    qualified: raw.PA >= c.qualifiedPA,
  }))

  const pitchers: PitcherPlayer[] = ds.pitchers.map((raw) => ({
    type: 'P', id: raw.id, name: raw.name, team: raw.team, raw,
    m: pitcherMetrics(raw, totals, c),
    // 투수 규정 이닝 기준은 아직 상수에 없다. 데모처럼 전원을 비교 대상으로 둔다
    qualified: true,
  }))

  return {
    meta: ds.meta,
    constants: c,
    totals,
    hitters,
    pitchers,
    byId: new Map<PlayerId, Player>([...hitters, ...pitchers].map((p) => [p.id, p])),
    pool: { H: hitters.filter((p) => p.qualified), P: pitchers.filter((p) => p.qualified) },
  }
}
