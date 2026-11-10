import { useEffect, useRef } from 'react'
import { candidates, slotOf, type Lineup } from '../../domain/lineup/lineup'
import { SLOT_LABEL, type LineupSlot } from '../../domain/lineup/slots'
import type { Player } from '../../domain/players'
import { formatWon, playerValue } from '../../domain/value/value'
import { useLeague, useLineupBasis } from '../shared/LeagueContext'

/** 자리를 누르면 뜨는 선수 고르기 창: 이름·팀·예상 가치·WAR (중간은 홀드, 마무리는 세이브) */
export default function LineupPicker({ slot, lineup, onPick, onClear, onClose }: {
  slot: LineupSlot
  lineup: Lineup
  onPick: (p: Player) => void
  onClear: () => void
  onClose: () => void
}) {
  const league = useLeague()
  const { roles } = useLineupBasis()
  const list = candidates(league, slot, roles)
  const label = SLOT_LABEL[slot]
  const closeRef = useRef<HTMLButtonElement>(null)
  const extra = slot === 'CL' ? '세이브' : slot === 'MR' ? '홀드' : null

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="picker-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="picker" role="dialog" aria-modal="true" aria-labelledby="picker-h">
        <div className="picker-head">
          <h2 id="picker-h">{label} 고르기</h2>
          <button ref={closeRef} type="button" className="btn ghost" onClick={onClose}>닫기</button>
        </div>
        <p className="muted picker-note">
          {slot === 'DH' ? '지명타자는 모든 타자 중에서 고를 수 있어요.' : slot === 'CL' ? '세이브가 많은 순서예요.' : `${label}만 고를 수 있어요. 예상 가치가 높은 순서예요.`}
          {' '}같은 선수는 한 자리에만 넣을 수 있어요.
        </p>
        <ul className="picker-list" aria-label={`${label} 후보`}>
          {list.map((p) => {
            const at = slotOf(lineup, p.id)
            const here = at === slot
            const elsewhere = at !== null && !here
            return (
              <li key={p.id}>
                <button type="button" className={`pick-row${here ? ' here' : ''}`} disabled={elsewhere} onClick={() => onPick(p)}>
                  <span className="pick-name">{p.name}{here && <span className="pick-tag">지금 이 자리</span>}{elsewhere && <span className="pick-tag">{SLOT_LABEL[at]} 자리에 있어요</span>}</span>
                  <span className="pick-team">{p.team}</span>
                  <span className="pick-stat"><small>예상 가치</small>{formatWon(playerValue(league, p).total)}</span>
                  <span className="pick-stat"><small>WAR</small>{p.m.WAR.toFixed(2)}</span>
                  {extra && p.type === 'P' && <span className="pick-stat"><small>{extra}</small>{(slot === 'CL' ? p.raw.SV : p.raw.HLD) ?? '-'}</span>}
                </button>
              </li>
            )
          })}
        </ul>
        {lineup.slots[slot] && <button type="button" className="btn ghost" onClick={onClear}>이 자리 비우기</button>}
      </div>
    </div>
  )
}
