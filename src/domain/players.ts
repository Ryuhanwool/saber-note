import type { DatasetMeta, LeagueConstants, Num, PlayerId, RawHitter, RawPitcher } from '../data/types'

/** 타자 지표. 값이 없으면 null (undefined는 쓰지 않는다) */
export type HitterMetrics = {
  // 타격
  avg: number; obp: number; slg: number; ops: number
  woba: number; wraa: number; wrcp: number; babip: Num
  bbp: number; kp: number; hr: number
  // 주루
  sb: number; sbp: Num; wsb: number; xbt: Num; ubr: Num; bsr: number
  // 수비
  inn: Num; uzr: Num; drs: Num; oaa: Num; zr: Num
  rngR: Num; errR: Num; dpR: Num; armR: Num; frmR: Num; blkR: Num; csR: Num; csp: Num
  fpct: Num; rf9: Num
  // 트래킹
  ev: Num; maxev: Num; la: Num; hard: Num; barrel: Num; xba: Num; sprint: Num; h2f: Num
  WAR: number
}

export type PitcherMetrics = {
  IP: number; era: number; fip: number; fipCore: number; whip: number; pk: number; pbb: number
  velo: Num; spin: Num; whiff: Num
  WAR: number
}

export type HitterPlayer = {
  type: 'H'; id: PlayerId; name: string; team: string
  raw: RawHitter
  m: HitterMetrics
  /** 백분위·리그 평균 대상 여부 (qualifiedPA 이상) */
  qualified: boolean
}

export type PitcherPlayer = {
  type: 'P'; id: PlayerId; name: string; team: string
  raw: RawPitcher
  m: PitcherMetrics
  qualified: boolean
}

export type Player = HitterPlayer | PitcherPlayer
export type PlayerType = Player['type']

/** 리그 전체에서 구한 기준값 */
export type LeagueTotals = {
  woba: number
  /** 출루(1루 도달) 1회당 도루 득점 */
  wsbPerOnFirst: number
  xbt: Num
  era: number
  /** FIP 상수 */
  cfip: number
}

export type League = {
  meta: DatasetMeta
  constants: LeagueConstants
  totals: LeagueTotals
  hitters: HitterPlayer[]
  pitchers: PitcherPlayer[]
  byId: ReadonlyMap<PlayerId, Player>
  /** 백분위·리그 평균 비교 대상 */
  pool: { H: HitterPlayer[]; P: PitcherPlayer[] }
}
