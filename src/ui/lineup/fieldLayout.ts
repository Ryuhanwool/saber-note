import type { LineupSlot } from '../../domain/lineup/slots'

/**
 * 자리 버튼 위치 (SVG 좌표 0~1000). 휴대폰 폭(야구장 약 320px, 버튼 56px ≈ 175)에서도 버튼끼리 겹치지 않게 잡았다.
 * 1루 쪽 오른편 여백에 지명타자, 3루 쪽 왼편 여백 「불펜」에 중간·마무리.
 */
export const SLOT_POS: Record<LineupSlot, { x: number; y: number }> = {
  C: { x: 500, y: 910 }, SP: { x: 500, y: 730 },
  '1B': { x: 720, y: 675 }, '2B': { x: 610, y: 520 }, SS: { x: 390, y: 520 }, '3B': { x: 280, y: 675 },
  LF: { x: 240, y: 400 }, CF: { x: 500, y: 360 }, RF: { x: 760, y: 400 },
  DH: { x: 910, y: 720 },
  MR: { x: 90, y: 668 }, CL: { x: 90, y: 860 },
}
