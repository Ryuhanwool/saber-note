import { describe, expect, it } from 'vitest'
import { getDataSource } from '../../data/registry'
import { buildLeague } from '../league'
import type { HitterPlayer, PitcherPlayer } from '../players'
import {
  adjustedPlayer, adjustedValue, clampClutch, hitterLimits, hitterStatsOf, initialClutch, isOriginal, pitcherStatsOf, setStat,
  type HitterStats, type PitcherStats,
} from './adjust'
import { playerValue } from './value'

const league = buildLeague(await getDataSource('demo').load())
const hitters = league.hitters, pitchers = league.pitchers

const valueOf = (p: HitterPlayer | PitcherPlayer, s: HitterStats | PitcherStats) => adjustedValue(league, p, s, initialClutch(league, p)).value.total
const warOf = (p: HitterPlayer | PitcherPlayer, s: HitterStats | PitcherStats) => adjustedPlayer(league, p, s).m.WAR

describe('스탯 조절 (domain)', () => {
  it('바꾸지 않으면 원래 지표·가치와 같다', () => {
    for (const p of [...hitters, ...pitchers]) {
      const s = p.type === 'H' ? hitterStatsOf(p.raw) : pitcherStatsOf(p.raw)
      expect(isOriginal(p, s)).toBe(true)
      expect(adjustedPlayer(league, p, s).m).toEqual(p.m)
      expect(adjustedValue(league, p, s, initialClutch(league, p)).value.total).toBe(playerValue(league, p).total)
    }
  })

  it('홈런·안타를 늘리면 WAR와 가치가 내려가지 않는다 (모든 타자)', () => {
    for (const p of hitters) {
      const s = hitterStatsOf(p.raw)
      for (const key of ['HR', 'H'] as const) {
        let cur = s
        for (let i = 0; i < 5; i++) {
          const next = setStat(p, cur, key, cur[key] + 1)
          expect(warOf(p, next), `${p.name} ${key}+${i + 1}`).toBeGreaterThanOrEqual(warOf(p, cur))
          expect(valueOf(p, next)).toBeGreaterThanOrEqual(valueOf(p, cur))
          cur = next
        }
      }
      // 홈런 10개를 늘리면 실제로 WAR가 오른다 (가치는 최저 금액에 걸려 있으면 그대로일 수 있다)
      expect(warOf(p, setStat(p, s, 'HR', s.HR + 10))).toBeGreaterThan(warOf(p, s))
    }
  })

  it('자책점·피홈런을 늘리면 가치가 올라가지 않는다 (모든 투수)', () => {
    for (const p of pitchers) {
      const s = pitcherStatsOf(p.raw)
      for (const key of ['ER', 'HR'] as const) {
        let cur = s
        for (let i = 0; i < 5; i++) {
          const next = setStat(p, cur, key, cur[key] + 1)
          expect(warOf(p, next), `${p.name} ${key}+${i + 1}`).toBeLessThanOrEqual(warOf(p, cur))
          expect(valueOf(p, next)).toBeLessThanOrEqual(valueOf(p, cur))
          cur = next
        }
      }
      expect(warOf(p, setStat(p, s, 'HR', s.HR + 10))).toBeLessThan(warOf(p, s))
    }
  })

  it('자책점은 ERA만 바꾸고 FIP·WAR(가치)는 그대로다 — FIP 기준 WAR라 같은 활약을 두 번 세지 않는다', () => {
    const p = pitchers[0]
    const s = setStat(p, pitcherStatsOf(p.raw), 'ER', p.raw.ER + 10)
    const q = adjustedPlayer(league, p, s)
    if (q.type !== 'P') throw new Error()
    expect(q.m.era).toBeGreaterThan(p.m.era)
    expect(q.m.fip).toBe(p.m.fip)
    expect(q.m.WAR).toBe(p.m.WAR)
  })

  it('OPS·wRC+·FIP가 기존 공식으로 다시 계산된다', () => {
    const h = hitters[0]
    const s = setStat(h, hitterStatsOf(h.raw), 'HR', h.raw.HR + 5)
    const q = adjustedPlayer(league, h, s)
    if (q.type !== 'H') throw new Error()
    expect(q.m.ops).toBeGreaterThan(h.m.ops)
    expect(q.m.wrcp).toBeGreaterThan(h.m.wrcp)
    expect(q.raw.S1).toBe(h.raw.S1 - 5) // 안타 수는 그대로, 단타 5개가 홈런으로
    const p = pitchers[0]
    const t = setStat(p, pitcherStatsOf(p.raw), 'SO', p.raw.SO + 10)
    const r = adjustedPlayer(league, p, t)
    if (r.type !== 'P') throw new Error()
    expect(r.m.fip).toBeLessThan(p.m.fip)
    expect(r.m.WAR).toBeGreaterThan(p.m.WAR)
  })

  it('말이 안 되는 값은 막는다: 홈런 > 안타, 안타 < 홈런, 이닝 0, 삼진 > 아웃, 타석을 넘는 기록, 음수', () => {
    const h = hitters[0]
    const s = hitterStatsOf(h.raw)
    expect(setStat(h, s, 'HR', s.H + 30).HR).toBe(s.H)
    expect(setStat(h, s, 'H', s.HR - 5).H).toBe(s.HR)
    expect(setStat(h, s, 'BB', -3).BB).toBe(0)
    const lim = hitterLimits(h.raw, s)
    expect(setStat(h, s, 'BB', 9999).BB).toBe(lim.BB.max)
    const full = setStat(h, s, 'BB', 9999)
    expect(full.BB + full.H + full.SO + h.raw.HBP).toBe(h.raw.PA)
    // 안타를 크게 줄이면 1루 출루가 줄어 도루도 함께 줄어든다
    const few = setStat(h, setStat(h, setStat(h, s, 'HR', 0), 'BB', 0), 'H', 0)
    expect(few.SB).toBeLessThanOrEqual(Math.max(0, h.raw.HBP - h.raw.CS))

    const p = pitchers[0]
    const t = pitcherStatsOf(p.raw)
    expect(setStat(p, t, 'outs', 0).outs).toBe(1)
    expect(setStat(p, t, 'outs', -10).outs).toBe(1)
    const fewOuts = setStat(p, t, 'outs', 5)
    expect(fewOuts.SO).toBeLessThanOrEqual(5)
    expect(setStat(p, t, 'SO', t.outs + 50).SO).toBe(t.outs)
    expect(setStat(p, t, 'ER', -1).ER).toBe(0)
    for (const x of [...hitters, ...pitchers]) {
      const q = adjustedPlayer(league, x, x.type === 'H' ? setStat(x, hitterStatsOf(x.raw), 'HR', 999) : setStat(x, pitcherStatsOf(x.raw), 'outs', 0))
      for (const v of Object.values(q.m)) if (typeof v === 'number') expect(Number.isFinite(v), x.name).toBe(true)
    }
  })

  it('클러치 점수 조절: 0.1 단위, −3~+3, 0.1당 1,000만 원', () => {
    expect(clampClutch(0.44)).toBe(0.4)
    expect(clampClutch(9)).toBe(3)
    expect(clampClutch(-9)).toBe(-3)
    const p = hitters.reduce((a, b) => (b.m.WAR > a.m.WAR ? b : a))
    const s = hitterStatsOf(p.raw)
    const v1 = adjustedValue(league, p, s, 0.5).value, v2 = adjustedValue(league, p, s, 0.6).value
    expect(v2.total - v1.total).toBe(10_000_000)
    expect(adjustedValue(league, p, s, -1).value.clutchAmount).toBe(0)
  })
})
