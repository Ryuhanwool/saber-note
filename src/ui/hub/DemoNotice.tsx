import { useId, useState } from 'react'
import type { DatasetMeta } from '../../data/types'

/** 짧은 안내 한 줄 (출처마다). 모르는 출처는 자세한 안내의 첫 문장 */
function shortNotice(meta: DatasetMeta): string {
  if (meta.league === 'demo') return '가상 데이터로 만든 시연판이에요'
  if (meta.league === 'mlb') return 'MLB 공개 데이터로 만든 프로토타입이에요'
  return meta.notice!.split(/(?<=[.다요])\s/)[0]
}

/** 맨 위 데이터 안내: 한 줄 + ⓘ (누르면 자세한 설명이 펼쳐진다) */
export default function DemoNotice({ meta }: { meta: DatasetMeta }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  if (!meta.notice) return null
  return (
    <div className="notice notice-short">
      <span>{shortNotice(meta)}</span>
      <button type="button" className="info-btn" aria-expanded={open} aria-controls={id} aria-label="데이터 안내 자세히 보기" onClick={() => setOpen(!open)}>ⓘ</button>
      {open && <p id={id} className="notice-detail">{meta.notice}</p>}
    </div>
  )
}
