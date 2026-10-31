// data 층이 넘기는 원시 데이터의 모양. domain은 이 파일만 import할 수 있다.
//
// 값 없음 규칙: 해당하지 않거나 모르는 값은 언제나 null로 넣는다. undefined나 빠진 필드는 쓰지 않는다.
// 그래서 아래 필드에는 `?`(선택 필드)를 쓰지 않는다. 필드를 빠뜨리면 타입 오류가 난다.

export type LeagueId = 'demo' | 'mlb' | 'kbo'
/** 리그 간 충돌을 막기 위해 `리그:번호` 형식으로 쓴다. 예: `kbo:123` */
export type PlayerId = `${LeagueId}:${number}`

export type FieldPosition = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH'
export type PitcherRole = 'SP' | 'RP'

/** 값이 없으면 null */
export type Num = number | null

export type RawRating = { label: string; grade: number }

/**
 * 수비 기록. 지명타자는 모든 항목이 null이다.
 * 포지션에 해당하지 않는 항목도 null이다 (예: 외야수의 dpR·DP, 포수가 아닌 선수의 csp).
 */
export type RawFielding = {
  /** 수비 이닝 */
  inn: Num
  /** 수비 기회(자살+보살+실책) — 수비율·레인지 팩터 계산용 */
  TC: Num
  /** 실책 */
  E: Num
  /** 병살 처리 (내야수) */
  DP: Num
  /** 보살 (외야수) */
  A_OF: Num
  // UZR 구성 요소 (득점)
  rngR: Num
  errR: Num
  dpR: Num
  armR: Num
  frmR: Num
  blkR: Num
  csR: Num
  /** 도루 저지율 (포수) */
  csp: Num
  // 출처가 직접 주는 종합 수비 지표
  drs: Num
  oaa: Num
  zr: Num
  /** 20~80 스카우팅 능력치 */
  ratings: RawRating[] | null
}

export type RawHitterTracking = {
  /** 평균 타구 속도 km/h */
  ev: Num
  maxev: Num
  /** 평균 발사각 ° */
  la: Num
  hard: Num
  barrel: Num
  /** 기대 타율 (출처 제공값) */
  xba: Num
  /** 스프린트 스피드 m/s */
  sprint: Num
  /** 홈→1루 시간 초 */
  h2f: Num
}

export type RawHitter = {
  id: PlayerId
  type: 'H'
  name: string
  team: string
  pos: FieldPosition
  age: number
  PA: number
  BB: number
  HBP: number
  SO: number
  HR: number
  S1: number
  D2: number
  D3: number
  SB: number
  CS: number
  /** 추가 진루율 (안타 때 한 베이스 더 간 비율) */
  xbt: Num
  fielding: RawFielding
  tracking: RawHitterTracking
}

export type RawPitchMix = { pitch: string; share: number }

export type RawPitcherTracking = {
  /** 평균 직구 구속 km/h */
  velo: Num
  spin: Num
  whiff: Num
  mix: RawPitchMix[] | null
}

export type RawPitcher = {
  id: PlayerId
  type: 'P'
  name: string
  team: string
  role: PitcherRole
  age: number
  /** 잡은 아웃 수 (이닝 × 3) */
  outs: number
  TBF: number
  SO: number
  BB: number
  HR: number
  HBP: number
  H: number
  ER: number
  tracking: RawPitcherTracking
}

export type RawBattedBall = { ev: number; la: number; hit: boolean }

/** 리그·기준마다 다른 계산 상수. domain은 이 값을 받아서만 계산한다. */
export type LeagueConstants = {
  woba: { bb: number; hbp: number; s1: number; d2: number; d3: number; hr: number }
  wobaScale: number
  /** 리그 타석당 득점 (wRC+ 기준) */
  runsPerPA: number
  /** 600타석당 포지션 보정 득점 */
  positionAdjust: Record<FieldPosition, number>
  /** 도루 성공·실패 득점 가치 */
  runSB: number
  runCS: number
  /** 600타석당 대체 선수 득점 */
  replacementRunsPer600: number
  /** 대체 선수 투수의 FIP = 리그 ERA + 이 값 */
  replacementFipGap: number
  runsPerWin: number
  /** 백분위·리그 평균 대상이 되는 최소 타석 */
  qualifiedPA: number
}

export type DatasetMeta = {
  league: LeagueId
  season: number
  /** 화면 상단 시즌 표기. 예: "가상 리그 2026", "KBO 2026" */
  seasonLabel: string
  /** 화면의 계산 기준 표기. 예: "스탯티즈 기준" */
  basisLabel: string
  /** 기록 반영일 (YYYY-MM-DD). 모르면 null */
  asOf: string | null
  source: string
  /** 화면 상단 안내 문구. 없으면 null */
  notice: string | null
  /** 이 출처가 어떤 기록을 제공하는지. 탭·지표 줄을 보여 줄지는 domain이 이 값으로 정한다 */
  available: DataAvailability
}

/**
 * 출처가 제공하는 기록 목록 (필드 하나하나 있음/없음).
 * - false: 이 출처에는 그 기록이 아예 없다 → 모든 선수의 값이 null이어야 하고, 화면에서 그 지표 줄을 숨긴다.
 * - true: 기록이 있다. 그래도 해당하지 않는 선수는 null일 수 있다(예: 지명타자의 수비) → 줄은 보이고 "기록 없음"으로 표시.
 * 타석·안타·이닝 같은 기본 기록은 언제나 있다고 본다.
 */
export type DataAvailability = {
  xbt: boolean
  fielding: Record<keyof RawFielding, boolean>
  hitterTracking: Record<keyof RawHitterTracking, boolean>
  pitcherTracking: Record<keyof RawPitcherTracking, boolean>
  /** loadBattedBalls가 타구 목록을 주는지 */
  battedBalls: boolean
}

export type RawDataset = {
  meta: DatasetMeta
  constants: LeagueConstants
  hitters: RawHitter[]
  pitchers: RawPitcher[]
}
