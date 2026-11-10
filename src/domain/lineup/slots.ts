// 나만의 라인업의 자리 12개: 야수 8 + 지명타자 + 선발·중간·마무리 투수

import type { LineupHitterSlotId, LineupSlotId } from '../../data/types'

export type HitterSlot = LineupHitterSlotId
export type PitcherSlot = Exclude<LineupSlotId, LineupHitterSlotId>
export type LineupSlot = LineupSlotId

export const HITTER_SLOTS: readonly HitterSlot[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH']
export const PITCHER_SLOTS: readonly PitcherSlot[] = ['SP', 'MR', 'CL']
/** 포지션별 픽 순위 탭 순서 */
export const LINEUP_SLOTS: readonly LineupSlot[] = [...HITTER_SLOTS, ...PITCHER_SLOTS]

export const SLOT_LABEL: Record<LineupSlot, string> = {
  C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수',
  LF: '좌익수', CF: '중견수', RF: '우익수', DH: '지명타자',
  SP: '선발 투수', MR: '중간 투수', CL: '마무리 투수',
}

export const isHitterSlot = (s: LineupSlot): s is HitterSlot => (HITTER_SLOTS as readonly string[]).includes(s)
