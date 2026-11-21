import { PAGE_SIZE } from './usePaged'

/** 「더 보기」 (남은 개수 표시). 남은 게 없으면 아무것도 그리지 않는다 */
export default function MoreButton({ rest, total, unit, onMore }: { rest: number; total: number; unit: string; onMore: () => void }) {
  if (rest <= 0) return null
  return (
    <div className="more-row">
      <button type="button" className="btn ghost more-btn" onClick={onMore}>
        더 보기 <span className="muted">({Math.min(rest, PAGE_SIZE)}{unit} 더 · 전체 {total}{unit})</span>
      </button>
    </div>
  )
}
