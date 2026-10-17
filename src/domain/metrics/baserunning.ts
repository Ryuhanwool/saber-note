import type { LeagueConstants, RawHitter } from '../../data/types'
import { isMissing } from '../missing'

// 주루 득점(BsR) = 도루 득점(wSB) + 추가 진루 득점(UBR)

/** 1루에 나간 횟수 (단타+볼넷+몸에 맞는 공) — 도루 기회 */
const onFirst = (h: RawHitter) => h.S1 + h.BB + h.HBP

export function leagueBaserunning(hitters: RawHitter[], c: LeagueConstants) {
  const wsbPerOnFirst = hitters.reduce((a, h) => a + c.runSB * h.SB + c.runCS * h.CS, 0) / hitters.reduce((a, h) => a + onFirst(h), 0)
  const withXbt = hitters.filter((h) => !isMissing(h.xbt))
  const xbt = withXbt.length
    ? withXbt.reduce((a, h) => a + h.xbt! * h.PA, 0) / withXbt.reduce((a, h) => a + h.PA, 0)
    : null
  return { wsbPerOnFirst, xbt }
}

export function baserunningStats(h: RawHitter, lg: { wsbPerOnFirst: number; xbt: number | null }, c: LeagueConstants) {
  const att = h.SB + h.CS
  const wsb = c.runSB * h.SB + c.runCS * h.CS - lg.wsbPerOnFirst * onFirst(h)
  const ubr = isMissing(h.xbt) || lg.xbt === null ? null : (h.xbt! - lg.xbt) * (h.S1 + h.BB) * 0.35 * 0.35 // 데모 간이 계수: 추가 진루 기회 비율 × 1회 득점 가치
  return {
    sb: h.SB,
    sbp: att ? h.SB / att : null,
    wsb,
    xbt: h.xbt,
    ubr,
    // 추가 진루 기록이 없으면 도루 득점만으로 계산한다
    bsr: wsb + (ubr ?? 0),
  }
}
