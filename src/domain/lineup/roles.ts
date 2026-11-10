// 불펜 역할: 구단마다 세이브가 가장 많은 불펜 투수가 마무리, 나머지 불펜은 중간 투수.
// 기준 날짜(meta.roleBasisDate) 리그로 한 번 정해 고정한다 → 날짜를 옮겨도 세이브·홀드 숫자만 바뀐다.
import type { PlayerId } from '../../data/types'
import type { League, PitcherPlayer } from '../players'

export type BullpenRole = 'CL' | 'MR'
export type BullpenRoles = ReadonlyMap<PlayerId, BullpenRole>

/** 리드를 지킨 등판 수 (1점 차 + 2점 차 이상, 모든 이닝) */
export function leadsHeld(p: PitcherPlayer): number {
  const c = p.raw.clutch
  if (!c) return 0
  const s = (x: { early: number; late: number; extra: number }) => x.early + x.late + x.extra
  return s(c.leadHeld1) + s(c.leadHeldMulti)
}

/** 마무리를 고르는 순서: 세이브 많은 순 → 리드를 지킨 횟수 → WAR → 이름순 */
export function compareCloser(a: PitcherPlayer, b: PitcherPlayer): number {
  return (b.raw.SV ?? 0) - (a.raw.SV ?? 0) || leadsHeld(b) - leadsHeld(a) || b.m.WAR - a.m.WAR || a.name.localeCompare(b.name, 'ko')
}

/** 구단별 불펜 투수를 마무리 순서로 */
export function bullpenByTeam(basis: League): Map<string, PitcherPlayer[]> {
  const out = new Map<string, PitcherPlayer[]>()
  for (const p of basis.pitchers) {
    if (p.raw.role !== 'RP') continue
    out.set(p.team, [...(out.get(p.team) ?? []), p])
  }
  for (const list of out.values()) list.sort(compareCloser)
  return out
}

/** 기준 리그로 불펜 역할을 정한다 */
export function bullpenRoles(basis: League): BullpenRoles {
  const roles = new Map<PlayerId, BullpenRole>()
  for (const list of bullpenByTeam(basis).values()) list.forEach((p, i) => roles.set(p.id, i === 0 ? 'CL' : 'MR'))
  return roles
}

/** 마무리로 정한 이유 (화면·보고용): "세이브 7 (같은 팀 2위 5)" 등 */
export function closerReason(basis: League, team: string): string | null {
  const list = bullpenByTeam(basis).get(team)
  if (!list?.length) return null
  const [a, b] = list
  if (!b) return `팀의 유일한 불펜 투수 (세이브 ${a.raw.SV ?? 0})`
  if ((a.raw.SV ?? 0) > (b.raw.SV ?? 0)) return `세이브 ${a.raw.SV} — 팀 불펜 1위 (${b.name} ${b.raw.SV ?? 0})`
  if (leadsHeld(a) > leadsHeld(b)) return `세이브 ${a.raw.SV ?? 0}로 같아 리드를 지킨 횟수로 (${leadsHeld(a)} 대 ${leadsHeld(b)})`
  if (a.m.WAR > b.m.WAR) return `세이브·리드 지킴이 같아 WAR로 (${a.m.WAR.toFixed(2)} 대 ${b.m.WAR.toFixed(2)})`
  return '세이브·리드 지킴·WAR가 같아 이름순으로'
}
