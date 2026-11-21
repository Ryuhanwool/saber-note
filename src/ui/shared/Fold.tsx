import { useId, type ReactNode } from 'react'
import { useFold } from './foldState'

type Props = {
  /** 열림 상태를 기억하는 이름 (묶음 종류) */
  id: string
  title: ReactNode
  /** 접혀 있을 때 보이는 요약 한 줄 */
  summary: ReactNode
  /** 제목 단계 (h2·h3) */
  level?: 2 | 3
  className?: string
  children: ReactNode
}

/** 처음엔 제목과 요약 한 줄만, 누르면 펼친다. 펼친 상태는 새로고침 전까지 기억 */
export default function Fold({ id, title, summary, level = 3, className, children }: Props) {
  const [open, setOpen] = useFold(id)
  const panelId = useId()
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <section className={`fold${open ? ' open' : ''}${className ? ` ${className}` : ''}`}>
      <H className="fold-h">
        <button type="button" className="fold-btn" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
          <span className="fold-title">{title}</span>
          <span className="fold-sum">{summary}</span>
          <span className="fold-chev" aria-hidden="true">{open ? '접기 ▴' : '펼치기 ▾'}</span>
        </button>
      </H>
      {open && <div id={panelId} className="fold-body">{children}</div>}
    </section>
  )
}
