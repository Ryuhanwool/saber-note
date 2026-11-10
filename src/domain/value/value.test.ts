import { describe, expect, it } from 'vitest'
import { DEMO_BASE_DATE } from '../../data/demo/season'
import { getDataSource } from '../../data/registry'
import { buildLeague } from '../league'
import { clutchScore } from './clutch'
import { expectedValue, formatWon, playerValue, valueFormula } from './value'

const league = buildLeague(await getDataSource('demo').loadDay!(DEMO_BASE_DATE))
const 억 = 100_000_000, 천만 = 10_000_000

describe('예상 가치 계산 (domain)', () => {
  it('WAR 0이면 1억, WAR 0.1 증가마다 1,000만 원 증가', () => {
    expect(expectedValue(0, null).total).toBe(억)
    for (let i = 0; i <= 80; i++) {
      const war = i / 10
      expect(expectedValue(war, null).total, `WAR ${war}`).toBe(억 + i * 천만)
      expect(expectedValue(war + 0.1, null).total - expectedValue(war, null).total).toBe(천만)
    }
  })

  it('클러치 0.1당 1,000만 원 추가, 0 이하면 추가금 0원 (깎지 않음)', () => {
    for (let i = 1; i <= 20; i++) expect(expectedValue(2, i / 10).clutchAmount, `클러치 ${i / 10}`).toBe(i * 천만)
    expect(expectedValue(2, 0.4).total).toBe(3 * 억 + 4 * 천만)
    for (const c of [0, -0.01, -0.3, -2]) {
      expect(expectedValue(2, c).clutchAmount).toBe(0)
      expect(expectedValue(2, c).total).toBe(expectedValue(2, null).total)
    }
  })

  it('아무리 낮아도 3,000만 원 아래로 내려가지 않고, 최대 제한은 없다', () => {
    expect(expectedValue(-0.7, null).total).toBe(3 * 천만) // 딱 최저 금액
    for (const war of [-0.8, -1, -3, -10]) {
      const v = expectedValue(war, -5)
      expect(v.total).toBe(3 * 천만)
      expect(v.floorApplied).toBe(true)
    }
    expect(expectedValue(-0.6, null).total).toBe(4 * 천만)
    expect(expectedValue(-0.6, null).floorApplied).toBe(false)
    expect(expectedValue(25, 5).total).toBe(31 * 억)
  })

  it('WAR·클러치는 0.1 단위로 반올림해서 계산한다', () => {
    expect(expectedValue(3.24, null).war).toBe(3.2)
    expect(expectedValue(3.25, null).war).toBe(3.3)
    expect(expectedValue(-0.25, null).war).toBe(-0.3)
    expect(expectedValue(0.04, 0.04).clutch).toBe(0)
  })

  it('리그 클러치 1위의 추가금은 1억~1억 5천만 원이다', () => {
    const top = [...league.hitters, ...league.pitchers].map((p) => playerValue(league, p).clutchAmount)
    const max = Math.max(...top)
    expect(max).toBeGreaterThanOrEqual(억)
    expect(max).toBeLessThanOrEqual(1.5 * 억)
  })

  it('선수 가치는 그 선수의 WAR와 클러치 점수로 계산한다', () => {
    for (const p of [...league.hitters, ...league.pitchers]) {
      const v = playerValue(league, p)
      expect(v).toEqual(expectedValue(p.m.WAR, clutchScore(league, p)!.wins))
      expect(v.total).toBeGreaterThanOrEqual(3 * 천만)
    }
  })
})

describe('금액 표시와 계산 과정 문장', () => {
  it('억·만 원 표시', () => {
    expect(formatWon(4.6 * 억)).toBe('4.6억')
    expect(formatWon(억)).toBe('1억')
    expect(formatWon(4 * 천만)).toBe('4,000만 원')
    expect(formatWon(-5 * 천만)).toBe('−5,000만 원')
    expect(formatWon(0)).toBe('0원')
    expect(formatWon(12 * 억 + 3 * 천만)).toBe('12.3억')
    expect(formatWon(억 + 2_500 * 10_000)).toBe('1억 2,500만 원')
  })

  it('「기준 1억 + WAR 3.2 → 3.2억 + 클러치 0.4 → 4,000만 원 = 예상 가치 4.6억」', () => {
    expect(valueFormula(expectedValue(3.2, 0.4))).toBe('기준 1억 + WAR 3.2 → 3.2억 + 클러치 0.4 → 4,000만 원 = 예상 가치 4.6억')
    expect(valueFormula(expectedValue(1.5, -0.3))).toBe('기준 1억 + WAR 1.5 → 1.5억 + 클러치 −0.3 → 0원 (0 이하는 깎지 않음) = 예상 가치 2.5억')
    expect(valueFormula(expectedValue(2, null))).toBe('기준 1억 + WAR 2.0 → 2억 = 예상 가치 3억')
    expect(valueFormula(expectedValue(-1.2, 0.1))).toBe('기준 1억 + WAR −1.2 → −1.2억 + 클러치 0.1 → 1,000만 원 = −1,000만 원 → 최저 3,000만 원 적용 = 예상 가치 3,000만 원')
  })
})
