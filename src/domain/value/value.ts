// 예상 선수 가치 = 기준 금액 + WAR × 1억 + 클러치 추가금. 재미용 계산이며 실제 연봉과 무관하다.
import type { League, Player } from '../players'
import { clutchScore } from './clutch'
import { VALUE_RULES } from './scoring'

/** 화면에 계산 과정을 단계별로 보여 주기 위한 항목별 결과 (금액은 원) */
export type ValueBreakdown = {
  base: number
  /** 계산에 쓴 WAR (0.1 단위로 반올림) */
  war: number
  warAmount: number
  /** 계산에 쓴 클러치 점수(승, 0.1 단위). 출처에 클러치 기록이 없으면 null */
  clutch: number | null
  /** 클러치 추가금. 클러치 점수가 0 이하이거나 없으면 0 */
  clutchAmount: number
  /** 최저 금액을 적용하기 전 합계 */
  sum: number
  /** 합계가 최저 금액보다 낮아 최저 금액을 적용했는지 */
  floorApplied: boolean
  total: number
}

/** 0.1 단위의 개수로 반올림 (예: 3.25 → 33). 부동소수점 오차와 음수 반올림 방향을 바로잡는다 */
export function tenths(x: number): number {
  const n = Math.round(Math.abs(x) / VALUE_RULES.step + 1e-9)
  return x < 0 ? -n : n
}
const fromTenths = (n: number) => (n === 0 ? 0 : n / 10)

/** WAR와 클러치 점수(승)로 예상 가치를 계산한다 */
export function expectedValue(war: number, clutchWins: number | null): ValueBreakdown {
  const R = VALUE_RULES
  const perTenthWar = R.perWar * R.step, perTenthClutch = R.perClutchWin * R.step
  const w = tenths(war)
  const c = clutchWins === null ? null : tenths(clutchWins)
  const warAmount = w * perTenthWar
  const clutchAmount = c !== null && c > 0 ? c * perTenthClutch : 0
  const sum = R.base + warAmount + clutchAmount
  return {
    base: R.base,
    war: fromTenths(w),
    warAmount: warAmount || 0,
    clutch: c === null ? null : fromTenths(c),
    clutchAmount,
    sum,
    floorApplied: sum < R.floor,
    total: Math.max(R.floor, sum),
  }
}

/** 리그 기록 그대로의 예상 가치 */
export function playerValue(league: League, p: Player): ValueBreakdown {
  return expectedValue(p.m.WAR, clutchScore(league, p)?.wins ?? null)
}

/** 원 → "4.6억", "4,000만 원", "0원", "−5,000만 원" */
export function formatWon(won: number): string {
  if (won === 0) return '0원'
  const sign = won < 0 ? '−' : ''
  const a = Math.abs(Math.round(won))
  const eok = Math.floor(a / 1e8)
  const man = Math.round((a % 1e8) / 1e4)
  if (eok === 0) return `${sign}${man.toLocaleString('ko-KR')}만 원`
  if (man === 0) return `${sign}${eok}억`
  if (man % 1000 === 0) return `${sign}${eok}.${man / 1000}억`
  return `${sign}${eok}억 ${man.toLocaleString('ko-KR')}만 원`
}

/** 0.1 단위 수를 부호와 함께 ("3.2", "−0.5", "0.0") */
const num1 = (x: number) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(1)

/** 계산 과정 한 줄: "기준 1억 + WAR 3.2 → 3.2억 + 클러치 0.4 → 4,000만 원 = 예상 가치 4.6억" */
export function valueFormula(b: ValueBreakdown): string {
  const parts = [`기준 ${formatWon(b.base)}`, `WAR ${num1(b.war)} → ${formatWon(b.warAmount)}`]
  if (b.clutch !== null) {
    parts.push(`클러치 ${num1(b.clutch)} → ${formatWon(b.clutchAmount)}${b.clutch <= 0 ? ' (0 이하는 깎지 않음)' : ''}`)
  }
  const floor = b.floorApplied ? ` → 최저 ${formatWon(VALUE_RULES.floor)} 적용` : ''
  return `${parts.join(' + ')}${b.floorApplied ? ` = ${formatWon(b.sum)}${floor}` : ''} = 예상 가치 ${formatWon(b.total)}`
}
