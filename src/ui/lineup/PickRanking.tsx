import type { LineupSlot } from '../../domain/lineup/slots'

/** 포지션별 픽 순위 (3단계에서 채운다) */
export default function PickRanking({ pos }: { pos: LineupSlot; onPos: (p: LineupSlot) => void }) {
  return <p className="muted" data-pos={pos}>포지션별 픽 순위는 준비 중이에요.</p>
}
