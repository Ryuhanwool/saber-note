// 예상 선수 가치의 점수표. 점수·배수·환산 비율을 조정할 때는 이 파일만 고친다.
// (PRD 8단계 「예상 선수 가치」)

import type { InningCounts } from '../../data/types'

/** 이닝 구간 배수: 1~6회 1배, 7~9회 1.5배, 연장 2배 */
export const INNING_MULTIPLIER: Readonly<InningCounts> = { early: 1, late: 1.5, extra: 2 }

/**
 * 타자 클러치 점수 (팀이 이긴 경기만).
 * 추격타는 안타 뒤에 남은 점수 차(1점·2점·3점 이상)로 나눈다.
 * 도루·호수비는 접전(동점이거나 1~2점 차)일 때만 기록된다.
 */
export const HITTER_POINTS = {
  goAhead: 3,
  tying: 2,
  chase1: 1,
  chase2: 0.5,
  chase3: 0.2,
  /** 접전 도루 성공 */
  steal: 0.5,
  /** 그 도루 주자가 득점하면 추가 */
  stealRun: 0.5,
  /** 접전·득점권 주자 상황에서 실점을 막은 호수비·보살 */
  defensePlay: 1,
} as const

/**
 * 투수 클러치 점수 (선발·불펜 구분 없음, 승패와 무관).
 * 위기 = 득점권 주자 + 점수 차 2점 이내(동점 포함).
 */
export const PITCHER_POINTS = {
  /** 위기 무실점 탈출 */
  escape: 1,
  /** 마지막 아웃이 삼진이면 추가 */
  escapeLastK: 0.5,
  /** 볼넷 없이 막으면 추가 */
  escapeNoBB: 0.3,
  /** 2점 차 이상 리드를 지킨 채 내려가거나 경기를 끝냄 */
  leadHeld: 1,
  /** 1점 차 리드를 지킴 */
  leadHeld1: 2,
} as const

/**
 * 클러치 점수 몇 점을 「1승」으로 보는지.
 * 가상 리그에서 클러치 1위의 추가금이 1억~1억 5천만 원(1.0~1.5승)이 되도록 정했다 (domain/value/value.test.ts가 확인).
 */
export const CLUTCH_POINTS_PER_WIN = 14

/** 예상 가치 계산 (원) */
export const VALUE_RULES = {
  /** 기준 금액 */
  base: 100_000_000,
  /** WAR 1당 (0.1당 1,000만 원) */
  perWar: 100_000_000,
  /** 클러치 1승당 (0.1당 1,000만 원). 클러치 점수가 0 이하면 추가금 0원 */
  perClutchWin: 100_000_000,
  /** 최저 금액 (최대 제한은 없다) */
  floor: 30_000_000,
  /** WAR·클러치 승리는 이 단위로 반올림해서 계산한다 */
  step: 0.1,
} as const
