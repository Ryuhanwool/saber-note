// 나만의 라인업 규칙: 자리마다 넣을 수 있는 선수, 같은 선수 중복 금지, 타순(1~9번, 투수는 없음).
import type { LineupDraft, PlayerId } from '../../data/types'
import type { League, Player } from '../players'
import { playerValue } from '../value/value'
import type { BullpenRoles } from './roles'
import { HITTER_SLOTS, LINEUP_SLOTS, SLOT_LABEL, isHitterSlot, type HitterSlot, type LineupSlot } from './slots'

export type Lineup = LineupDraft

export const emptyLineup = (): Lineup => ({
  slots: Object.fromEntries(LINEUP_SLOTS.map((s) => [s, null])) as Lineup['slots'],
  order: [],
})

/**
 * 그 자리에 넣을 수 있는 선수인지.
 * 야수 자리는 그 포지션 타자, 지명타자는 모든 타자, 선발은 선발 투수, 중간·마무리는 그 역할의 불펜 투수.
 */
export function eligible(slot: LineupSlot, p: Player, roles: BullpenRoles): boolean {
  if (slot === 'DH') return p.type === 'H'
  if (isHitterSlot(slot)) return p.type === 'H' && p.raw.pos === slot
  if (p.type !== 'P') return false
  if (slot === 'SP') return p.raw.role === 'SP'
  return roles.get(p.id) === slot
}

/** 고르기 목록: 마무리는 세이브 많은 순, 나머지는 예상 가치 높은 순 (같으면 WAR, 이름) */
export function candidates(league: League, slot: LineupSlot, roles: BullpenRoles): Player[] {
  const all = [...league.hitters, ...league.pitchers].filter((p) => eligible(slot, p, roles))
  const value = new Map(all.map((p) => [p.id, playerValue(league, p).total]))
  const sv = (p: Player) => (p.type === 'P' ? (p.raw.SV ?? 0) : 0)
  return all.sort((a, b) =>
    (slot === 'CL' ? sv(b) - sv(a) : 0) || value.get(b.id)! - value.get(a.id)! || b.m.WAR - a.m.WAR || a.name.localeCompare(b.name, 'ko'))
}

/** 이 선수가 들어 있는 자리 (없으면 null) */
export function slotOf(l: Lineup, id: PlayerId): LineupSlot | null {
  return LINEUP_SLOTS.find((s) => l.slots[s] === id) ?? null
}

export type PlaceResult =
  | { ok: true; lineup: Lineup }
  | { ok: false; reason: 'not-eligible' }
  | { ok: false; reason: 'duplicate'; at: LineupSlot }

/** 자리에 선수를 넣는다. 타자 자리를 새로 채우면 타순 맨 뒤에 붙는다 (바꿔 넣으면 타순 그대로) */
export function place(l: Lineup, slot: LineupSlot, p: Player, roles: BullpenRoles): PlaceResult {
  if (!eligible(slot, p, roles)) return { ok: false, reason: 'not-eligible' }
  const at = slotOf(l, p.id)
  if (at && at !== slot) return { ok: false, reason: 'duplicate', at }
  const order = isHitterSlot(slot) && !l.order.includes(slot) ? [...l.order, slot] : l.order
  return { ok: true, lineup: { slots: { ...l.slots, [slot]: p.id }, order } }
}

/** 자리를 비운다 (타순에서도 빠지고 뒤 타순이 하나씩 당겨진다) */
export function clearSlot(l: Lineup, slot: LineupSlot): Lineup {
  return { slots: { ...l.slots, [slot]: null }, order: l.order.filter((s) => s !== slot) }
}

/** 타순을 옮긴다 (delta −1: 한 칸 앞으로, +1: 한 칸 뒤로) */
export function moveOrder(l: Lineup, slot: HitterSlot, delta: -1 | 1): Lineup {
  const i = l.order.indexOf(slot), j = i + delta
  if (i < 0 || j < 0 || j >= l.order.length) return l
  const order = [...l.order]
  ;[order[i], order[j]] = [order[j], order[i]]
  return { ...l, order }
}

/** 타순 번호 (1부터). 투수 자리와 빈 자리는 null */
export function battingOrder(l: Lineup, slot: LineupSlot): number | null {
  if (!isHitterSlot(slot)) return null
  const i = l.order.indexOf(slot)
  return i < 0 ? null : i + 1
}

/**
 * 저장돼 있던 라인업을 규칙에 맞게 고친다 (저장소에서 읽을 때): 모르는 선수·맞지 않는 자리·두 번 나온 선수는 비우고,
 * 타순은 채운 타자 자리만 한 번씩 (빠진 자리는 뒤에 붙인다).
 */
export function sanitize(raw: unknown, league: League, roles: BullpenRoles): Lineup {
  const l = emptyLineup()
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<Lineup>
  const seen = new Set<PlayerId>()
  for (const slot of LINEUP_SLOTS) {
    const id = src.slots?.[slot]
    const p = typeof id === 'string' ? league.byId.get(id as PlayerId) : undefined
    if (p && !seen.has(p.id) && eligible(slot, p, roles)) {
      l.slots[slot] = p.id
      seen.add(p.id)
    }
  }
  const filled = HITTER_SLOTS.filter((s) => l.slots[s] !== null)
  const order = (Array.isArray(src.order) ? src.order : []).filter((s, i, a): s is HitterSlot => filled.includes(s as HitterSlot) && a.indexOf(s) === i)
  l.order = [...order, ...filled.filter((s) => !order.includes(s))]
  return l
}

/** 라인업이 규칙에 맞는지 (테스트·저장 전 확인용). 틀린 곳을 문장으로 */
export function problems(l: Lineup, league: League, roles: BullpenRoles): string[] {
  const out: string[] = []
  const seen = new Map<PlayerId, LineupSlot>()
  for (const slot of LINEUP_SLOTS) {
    const id = l.slots[slot]
    if (!id) continue
    const p = league.byId.get(id)
    if (!p) out.push(`${SLOT_LABEL[slot]}: 없는 선수`)
    else if (!eligible(slot, p, roles)) out.push(`${SLOT_LABEL[slot]}: ${p.name}은(는) 이 자리에 넣을 수 없어요`)
    if (seen.has(id)) out.push(`${SLOT_LABEL[slot]}: ${SLOT_LABEL[seen.get(id)!]} 자리와 같은 선수`)
    seen.set(id, slot)
  }
  const filled = HITTER_SLOTS.filter((s) => l.slots[s] !== null)
  if (l.order.length !== filled.length || new Set(l.order).size !== l.order.length || !l.order.every((s) => filled.includes(s))) {
    out.push('타순은 채운 타자 자리가 한 번씩이어야 해요')
  }
  return out
}

/** 라인업 합계: 채운 선수의 예상 가치·WAR 합 */
export function lineupTotals(l: Lineup, league: League): { value: number; war: number; filled: number } {
  let value = 0, war = 0, filled = 0
  for (const slot of LINEUP_SLOTS) {
    const p = l.slots[slot] ? league.byId.get(l.slots[slot]!) : undefined
    if (!p) continue
    value += playerValue(league, p).total
    war += p.m.WAR
    filled++
  }
  return { value, war, filled }
}
