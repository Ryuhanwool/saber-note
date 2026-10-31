// MLB 베이스볼 서번트 데이터 출처 (PRD 대체 방법 B: MLB 데이터로 화면을 먼저 검증)
// 뼈대 단계: 실제 내려받기는 아직 없고, 행을 불러오는 함수를 바깥에서 받는다.
// 실제 데이터를 연결하면 registry에 등록한다.
import { availability } from '../availability'
import type { LeagueDataSource } from '../source'
import type { LeagueConstants, RawDataset } from '../types'
import { toRawBattedBall, toRawHitter, toRawPitcher, type MlbBattedBallRow, type MlbHitterRow, type MlbPitcherRow } from './savant'

export type MlbSourceOptions = {
  season: number
  /** 기록 반영일 (YYYY-MM-DD) */
  asOf: string | null
  /** 시즌별 wOBA 가중치 등. 시즌마다 달라서 코드에 고정하지 않는다 */
  constants: LeagueConstants
  loadRows: () => Promise<{ hitters: MlbHitterRow[]; pitchers: MlbPitcherRow[] }>
  /** 타구 단위 데이터(Statcast 검색). 없으면 타구 분포 그래프를 숨긴다 */
  loadBattedBalls?: (playerId: number) => Promise<MlbBattedBallRow[]>
}

export function createMlbSource(opts: MlbSourceOptions): LeagueDataSource {
  return {
    league: 'mlb',

    async load(): Promise<RawDataset> {
      const rows = await opts.loadRows()
      return {
        meta: {
          league: 'mlb',
          season: opts.season,
          seasonLabel: `MLB ${opts.season}`,
          basisLabel: 'MLB 베이스볼 서번트 공개 데이터 (화면 검증용)',
          asOf: opts.asOf,
          source: 'Baseball Savant',
          notice: 'MLB 베이스볼 서번트 공개 데이터로 화면을 검증하는 프로토타입입니다. KBO 기록이 아닙니다.',
          available: availability({
            xbt: false,
            fielding: ['oaa'],
            hitterTracking: ['ev', 'maxev', 'la', 'hard', 'barrel', 'xba', 'sprint', 'h2f'],
            pitcherTracking: ['velo', 'spin', 'whiff'],
            battedBalls: Boolean(opts.loadBattedBalls),
          }),
        },
        constants: opts.constants,
        hitters: rows.hitters.map(toRawHitter),
        pitchers: rows.pitchers.map(toRawPitcher),
      }
    },

    async loadBattedBalls(id) {
      if (!opts.loadBattedBalls) return []
      const rows = await opts.loadBattedBalls(Number(id.split(':')[1]))
      return rows.map(toRawBattedBall)
    },
  }
}
