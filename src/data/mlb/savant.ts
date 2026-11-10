// MLB 기록 한 줄 → 앱의 원시 기록. 뼈대 단계라 CSV를 내려받거나 파싱하지는 않는다.
// 아래 행 타입의 필드 이름은 서번트 리더보드 CSV 열 이름을 따랐지만, 실제 파일을 받을 때 다시 확인한다.
// 기본 기록(타석·안타 등)은 서번트 커스텀 리더보드나 MLB Stats API에서 채운다.
import { emptyFielding } from '../records'
import type { FieldPosition, PitcherRole, RawBattedBall, RawHitter, RawPitcher } from '../types'
import { ftpsToMps, mphToKmh, percentToRate } from './units'

export type MlbHitterRow = {
  player_id: number
  name: string
  team: string
  pos: FieldPosition
  age: number
  pa: number
  single: number
  double: number
  triple: number
  home_run: number
  walk: number
  hit_by_pitch: number
  strikeout: number
  stolen_base: number
  caught_stealing: number
  /** 평균 타구 속도 (mph) */
  exit_velocity_avg: number | null
  /** 최고 타구 속도 (mph) */
  max_hit_speed: number | null
  /** 평균 발사각 (°) */
  launch_angle_avg: number | null
  /** 강한 타구 비율 (0~100, 95mph 이상) */
  hard_hit_percent: number | null
  /** 배럴 비율 (0~100) */
  barrel_batted_rate: number | null
  xba: number | null
  /** 스프린트 스피드 (ft/s) */
  sprint_speed: number | null
  /** 홈→1루 시간 (초) */
  hp_to_1b: number | null
  /** OAA. 포수·지명타자는 없음(null) */
  outs_above_average: number | null
}

export type MlbPitcherRow = {
  player_id: number
  name: string
  team: string
  role: PitcherRole
  age: number
  outs: number
  batters_faced: number
  strikeout: number
  walk: number
  home_run: number
  hit_by_pitch: number
  hits: number
  earned_runs: number
  /** 포심 평균 구속 (mph) */
  fastball_avg_speed: number | null
  /** 포심 평균 회전수 (rpm) */
  fastball_avg_spin: number | null
  /** 헛스윙 비율 (0~100) */
  whiff_percent: number | null
}

export type MlbBattedBallRow = {
  /** 타구 속도 (mph) */
  launch_speed: number
  launch_angle: number
  is_hit: boolean
}

export function toRawHitter(r: MlbHitterRow): RawHitter {
  return {
    id: `mlb:${r.player_id}`,
    type: 'H',
    name: r.name,
    team: r.team,
    pos: r.pos,
    age: r.age,
    PA: r.pa,
    BB: r.walk,
    HBP: r.hit_by_pitch,
    SO: r.strikeout,
    HR: r.home_run,
    S1: r.single,
    D2: r.double,
    D3: r.triple,
    SB: r.stolen_base,
    CS: r.caught_stealing,
    xbt: null, // 서번트에는 추가 진루율이 없다
    // 서번트 수비 기록은 OAA뿐이다 (DRS·UZR·ZR·능력치·전통 기록 없음)
    fielding: { ...emptyFielding(), oaa: r.outs_above_average },
    tracking: {
      ev: mphToKmh(r.exit_velocity_avg),
      maxev: mphToKmh(r.max_hit_speed),
      la: r.launch_angle_avg,
      hard: percentToRate(r.hard_hit_percent),
      barrel: percentToRate(r.barrel_batted_rate),
      xba: r.xba,
      sprint: ftpsToMps(r.sprint_speed),
      h2f: r.hp_to_1b,
    },
    // 서번트 시즌 리더보드에는 경기 상황별(클러치) 기록이 없다
    clutch: null,
  }
}

export function toRawPitcher(r: MlbPitcherRow): RawPitcher {
  return {
    id: `mlb:${r.player_id}`,
    type: 'P',
    name: r.name,
    team: r.team,
    role: r.role,
    age: r.age,
    outs: r.outs,
    TBF: r.batters_faced,
    SO: r.strikeout,
    BB: r.walk,
    HR: r.home_run,
    HBP: r.hit_by_pitch,
    H: r.hits,
    ER: r.earned_runs,
    tracking: {
      velo: mphToKmh(r.fastball_avg_speed),
      spin: r.fastball_avg_spin,
      whiff: percentToRate(r.whiff_percent),
      mix: null, // 구종 비율(pitch arsenal)은 뼈대에 넣지 않았다
    },
    clutch: null,
  }
}

export const toRawBattedBall = (b: MlbBattedBallRow): RawBattedBall => ({
  ev: mphToKmh(b.launch_speed)!,
  la: b.launch_angle,
  hit: b.is_hit,
})
