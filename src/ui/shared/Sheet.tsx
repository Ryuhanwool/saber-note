import { useEffect, useId, useRef, type ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * 아래에서 올라오는 창 (글쓰기). 닫혀 있어도 내용은 그대로 둔다 — 쓰던 글·사진이 닫았다 열어도 남는다.
 * 열리면 첫 입력칸에 초점, Esc·바깥(어두운 막)·「닫기」로 닫는다
 */
export default function Sheet({ open, onClose, title, children }: Props) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    // 글 칸이 있으면 글 칸, 없으면 첫 입력칸, 그것도 없으면 첫 버튼에 초점
    const el = panel.current
    ;(el?.querySelector<HTMLElement>('.sheet-body textarea') ?? el?.querySelector<HTMLElement>('.sheet-body input:not([type=file])') ?? el?.querySelector<HTMLElement>('button'))?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return (
    <div className="sheet-root" hidden={!open}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panel}>
        <div className="sheet-head">
          <span className="sheet-grip" aria-hidden="true" />
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="btn ghost" onClick={onClose}>닫기</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
