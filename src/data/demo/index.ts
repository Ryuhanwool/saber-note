import { ALL_AVAILABLE } from '../availability'
import type { LeagueDataSource } from '../source'
import type { LeagueConstants, RawDataset } from '../types'
import { demoBattedBalls } from './battedBalls'
import { DEMO_SEED, generateDemoLeague, type DemoLeague } from './generate'

/** 데모 HTML이 쓰던 간이 공식 상수 */
export const DEMO_CONSTANTS: LeagueConstants = {
  woba: { bb: 0.69, hbp: 0.72, s1: 0.89, d2: 1.27, d3: 1.62, hr: 2.1 },
  wobaScale: 1.2,
  runsPerPA: 0.118,
  positionAdjust: { C: 12.5, SS: 7.5, '2B': 2.5, '3B': 2.5, CF: 2.5, LF: -7.5, RF: -7.5, '1B': -12.5, DH: -17.5 },
  runSB: 0.2,
  runCS: -0.41,
  replacementRunsPer600: 20,
  replacementFipGap: 1.4,
  runsPerWin: 10,
  qualifiedPA: 300,
}

const SEASON = 2026

let league: DemoLeague | null = null
const getLeague = () => (league ??= generateDemoLeague())

export const demoSource: LeagueDataSource = {
  league: 'demo',

  async load(): Promise<RawDataset> {
    const { hitters, pitchers } = getLeague()
    return {
      meta: {
        league: 'demo',
        season: SEASON,
        seasonLabel: `가상 리그 ${SEASON}`,
        basisLabel: '데모 간이 공식 (실서비스는 스탯티즈 기준)',
        asOf: null,
        source: `가상 데이터 (시드 ${DEMO_SEED})`,
        notice: '모든 선수, 팀, 기록은 화면 구현을 보여 주기 위해 만든 가상 데이터입니다. 실제 서비스에서는 이 자리에 스탯티즈 기준으로 계산한 실제 기록이 들어갑니다.',
        // 데모는 모든 기록을 만든다
        available: ALL_AVAILABLE,
      },
      constants: DEMO_CONSTANTS,
      hitters,
      pitchers,
    }
  },

  async loadBattedBalls(id) {
    const h = getLeague().hitters.find((p) => p.id === id)
    return h ? demoBattedBalls(Number(id.split(':')[1]), h.tracking) : []
  },
}
