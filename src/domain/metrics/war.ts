import type { FieldPosition, LeagueConstants } from '../../data/types'

/** 타자 WAR = (타격 + 포지션 보정 + 수비 + 주루 + 대체 선수 보정) 득점 / 승리당 득점 */
export function hitterWar(
  x: { wraa: number; uzr: number | null; bsr: number; PA: number; pos: FieldPosition },
  c: LeagueConstants,
): number {
  // 곱한 뒤 600으로 나눈다 (데모와 같은 연산 순서)
  return (x.wraa + (c.positionAdjust[x.pos] * x.PA) / 600 + (x.uzr ?? 0) + x.bsr + (c.replacementRunsPer600 * x.PA) / 600) / c.runsPerWin
}
