import { useId } from 'react'
import { LINEUP_SLOTS, SLOT_LABEL, type LineupSlot } from '../../domain/lineup/slots'
import { SLOT_POS } from './fieldLayout'

export type FieldSlot = { slot: LineupSlot; name: string | null; order: number | null }

/** 홈플레이트, 파울 라인 끝, 외야 담장 */
const HOME = { x: 500, y: 860 }
const R = 560 // 홈에서 외야 담장까지
const D = R / Math.SQRT2
const LEFT = { x: HOME.x - D, y: HOME.y - D }
const RIGHT = { x: HOME.x + D, y: HOME.y - D }
const BASE = 200 // 베이스 사이 거리
const b = BASE / Math.SQRT2
const FIRST = { x: HOME.x + b, y: HOME.y - b }, SECOND = { x: HOME.x, y: HOME.y - 2 * b }, THIRD = { x: HOME.x - b, y: HOME.y - b }
const fair = `M${HOME.x} ${HOME.y} L${LEFT.x} ${LEFT.y} A${R} ${R} 0 0 1 ${RIGHT.x} ${RIGHT.y} Z`
const dirtR = 300

/** 위에서 내려다본 야구장 (코드로 그린 SVG, 외부 이미지 없음) */
function FieldDrawing() {
  const id = useId().replace(/:/g, '')
  const diamond = (inset: number) => {
    const k = inset / Math.SQRT2
    return `M${HOME.x} ${HOME.y - inset * Math.SQRT2} L${FIRST.x - k} ${FIRST.y} L${SECOND.x} ${SECOND.y + inset * Math.SQRT2} L${THIRD.x + k} ${THIRD.y} Z`
  }
  const base = (p: { x: number; y: number }) => <rect x={p.x - 9} y={p.y - 9} width={18} height={18} transform={`rotate(45 ${p.x} ${p.y})`} className="f-base" />
  return (
    <svg className="field-svg" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`fair-${id}`}><path d={fair} /></clipPath>
      </defs>
      {/* 파울 지역 */}
      <rect x="0" y="0" width="1000" height="1000" rx="28" className="f-foul" />
      {/* 외야·내야 잔디와 줄무늬 */}
      <path d={fair} className="f-grass" />
      <g clipPath={`url(#fair-${id})`}>
        {Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * 90 - 40} y="0" width="45" height="1000" className="f-stripe" transform="rotate(45 500 860)" />)}
        {/* 내야 흙 (홈에서 부채꼴) */}
        <path d={`M${HOME.x} ${HOME.y} L${HOME.x - dirtR / Math.SQRT2} ${HOME.y - dirtR / Math.SQRT2} A${dirtR} ${dirtR} 0 0 1 ${HOME.x + dirtR / Math.SQRT2} ${HOME.y - dirtR / Math.SQRT2} Z`} className="f-dirt" />
      </g>
      {/* 내야 잔디 */}
      <path d={diamond(26)} className="f-grass" />
      {/* 파울 라인 */}
      <line x1={HOME.x} y1={HOME.y} x2={LEFT.x} y2={LEFT.y} className="f-line" />
      <line x1={HOME.x} y1={HOME.y} x2={RIGHT.x} y2={RIGHT.y} className="f-line" />
      {/* 마운드 */}
      <circle cx={HOME.x} cy={HOME.y - 135} r="30" className="f-dirt" />
      <rect x={HOME.x - 12} y={HOME.y - 138} width="24" height="6" className="f-base" />
      {/* 홈 주변 흙과 홈플레이트 */}
      <circle cx={HOME.x} cy={HOME.y} r="40" className="f-dirt" />
      <path d={`M${HOME.x - 10} ${HOME.y - 8} h20 v8 l-10 10 l-10 -10 Z`} className="f-base" />
      {base(FIRST)}{base(SECOND)}{base(THIRD)}
      {/* 불펜 (3루 쪽 왼편 여백) */}
      {/* 「불펜」 글자는 상자 위에 둔다 (휴대폰 폭에서 버튼이 커져도 가리지 않게) */}
      <text x="90" y="560" textAnchor="middle" className="f-label">불펜</text>
      <rect x="12" y="575" width="156" height="395" rx="18" className="f-pen" />
    </svg>
  )
}

/** 야구장과 자리 버튼 12개. 버튼은 SVG 위의 HTML 버튼이라 키보드·화면 읽기 프로그램으로도 쓸 수 있다 */
export default function Field({ slots, onSelect }: { slots: FieldSlot[]; onSelect: (slot: LineupSlot) => void }) {
  const bySlot = new Map(slots.map((s) => [s.slot, s]))
  return (
    <div className="field">
      <FieldDrawing />
      {LINEUP_SLOTS.map((slot) => {
        const s = bySlot.get(slot) ?? { slot, name: null, order: null }
        const pos = SLOT_POS[slot]
        const label = SLOT_LABEL[slot]
        const aria = s.name
          ? `${label}: ${s.name}${s.order ? `, ${s.order}번 타자` : ''} — 바꾸기`
          : `${label} — 비어 있음, 선수 고르기`
        return (
          <button
            key={slot}
            type="button"
            className={`slot${s.name ? ' filled' : ''}`}
            style={{ left: `${pos.x / 10}%`, top: `${pos.y / 10}%` }}
            aria-label={aria}
            data-slot={slot}
            onClick={() => onSelect(slot)}
          >
            {s.name ? <span className="slot-name">{s.name}</span> : <span className="slot-pos">{label}</span>}
            {s.order !== null && <span className="slot-order" aria-hidden="true">{s.order}</span>}
          </button>
        )
      })}
    </div>
  )
}
