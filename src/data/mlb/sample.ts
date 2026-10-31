// 테스트·화면 확인용 가상 표본. 실제 선수·기록이 아니다 (이름과 숫자 모두 지어낸 값).
import type { LeagueConstants } from '../types'
import type { MlbSourceOptions } from '.'
import type { MlbHitterRow, MlbPitcherRow } from './savant'

/** 표본용 상수. 실제 시즌 값이 아니다 */
export const SAMPLE_CONSTANTS: LeagueConstants = {
  woba: { bb: 0.69, hbp: 0.72, s1: 0.88, d2: 1.25, d3: 1.59, hr: 2.05 },
  wobaScale: 1.24,
  runsPerPA: 0.118,
  positionAdjust: { C: 12.5, SS: 7.5, '2B': 2.5, '3B': 2.5, CF: 2.5, LF: -7.5, RF: -7.5, '1B': -12.5, DH: -17.5 },
  runSB: 0.2,
  runCS: -0.41,
  replacementRunsPer600: 20,
  replacementFipGap: 1.4,
  runsPerWin: 10,
  qualifiedPA: 300,
}

const hitter = (id: number, name: string, pos: MlbHitterRow['pos'], extra: Partial<MlbHitterRow>): MlbHitterRow => ({
  player_id: id, name, team: '표본 팀', pos, age: 28,
  pa: 600, single: 95, double: 30, triple: 3, home_run: 25, walk: 60, hit_by_pitch: 6, strikeout: 130,
  stolen_base: 10, caught_stealing: 3,
  exit_velocity_avg: 90, max_hit_speed: 112, launch_angle_avg: 13, hard_hit_percent: 42, barrel_batted_rate: 9,
  xba: 0.255, sprint_speed: 27, hp_to_1b: 4.3, outs_above_average: 0,
  ...extra,
})

export const SAMPLE_HITTERS: MlbHitterRow[] = [
  hitter(9001, '표본 유격수', 'SS', { exit_velocity_avg: 100, sprint_speed: 29.5, outs_above_average: 12 }),
  hitter(9002, '표본 포수', 'C', { home_run: 15, outs_above_average: null, sprint_speed: 25 }),
  hitter(9003, '표본 지명타자', 'DH', { home_run: 38, exit_velocity_avg: 94, outs_above_average: null }),
  hitter(9004, '표본 중견수', 'CF', { sprint_speed: 30, outs_above_average: -4 }),
]

export const SAMPLE_PITCHERS: MlbPitcherRow[] = [
  { player_id: 9101, name: '표본 선발', team: '표본 팀', role: 'SP', age: 30, outs: 540, batters_faced: 760, strikeout: 190, walk: 50,
    home_run: 20, hit_by_pitch: 7, hits: 160, earned_runs: 70, fastball_avg_speed: 95, fastball_avg_spin: 2350, whiff_percent: 27 },
  { player_id: 9102, name: '표본 불펜', team: '표본 팀', role: 'RP', age: 26, outs: 195, batters_faced: 270, strikeout: 80, walk: 25,
    home_run: 6, hit_by_pitch: 3, hits: 50, earned_runs: 22, fastball_avg_speed: 98, fastball_avg_spin: 2480, whiff_percent: 33 },
]

export const SAMPLE_OPTIONS: MlbSourceOptions = {
  season: 2026,
  asOf: '2026-10-01',
  constants: SAMPLE_CONSTANTS,
  loadRows: async () => ({ hitters: SAMPLE_HITTERS, pitchers: SAMPLE_PITCHERS }),
  loadBattedBalls: async () => [
    { launch_speed: 100, launch_angle: 25, is_hit: true },
    { launch_speed: 80, launch_angle: 60, is_hit: false },
  ],
}
