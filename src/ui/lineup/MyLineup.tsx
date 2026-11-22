import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PlayerId } from '../../data/types'
import { battingOrder, candidates, clearSlot, emptyLineup, lineupTotals, moveOrder, place, problems, sanitize, slotOf, type Lineup } from '../../domain/lineup/lineup'
import { HITTER_SLOTS, PITCHER_SLOTS, SLOT_LABEL, type HitterSlot, type LineupSlot } from '../../domain/lineup/slots'
import type { Player } from '../../domain/players'
import { formatWon, playerValue } from '../../domain/value/value'
import { useRequireLogin } from '../auth/login'
import { useLeague, useLineupBasis } from '../shared/LeagueContext'
import Field, { type FieldSlot } from './Field'
import { useLineupStore } from './LineupContext'

/** 로그인하러 가는 동안 써 두던 라인업을 이 탭에 잠시 보관한다 (auth/login의 보관 규칙과 같은 열쇠 형식) */
const DRAFT_KEY = 'saber-note-draft:lineup'
const peekDraft = (): unknown => {
  try {
    const t = sessionStorage.getItem(DRAFT_KEY)
    return t ? JSON.parse(t) : null
  } catch {
    return null
  }
}
const dropDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // 지우지 못해도 괜찮다
  }
}

const sameLineup = (a: Lineup, b: Lineup) => JSON.stringify(a) === JSON.stringify(b)

/** 불펜 기록 한 줄 (중간 투수 홀드, 마무리 투수 세이브) */
function bullpenStat(slot: LineupSlot, p: Player): string | null {
  if (p.type !== 'P') return null
  if (slot === 'CL') return `세이브 ${p.raw.SV ?? 0}`
  if (slot === 'MR') return `홀드 ${p.raw.HLD ?? 0}`
  return null
}

/** 자리를 누르면 뜨는 선수 고르기 창 */
function Picker({ slot, lineup, onPick, onClear, onClose }: {
  slot: LineupSlot; lineup: Lineup; onPick: (p: Player) => void; onClear: () => void; onClose: () => void
}) {
  const league = useLeague()
  const { roles } = useLineupBasis()
  const list = useMemo(() => candidates(league, slot, roles), [league, slot, roles])
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const label = SLOT_LABEL[slot]
  return (
    <div className="picker-backdrop" onClick={onClose}>
      <div className="picker" role="dialog" aria-modal="true" aria-labelledby="picker-h" onClick={(e) => e.stopPropagation()}>
        <div className="picker-head">
          <h2 id="picker-h">{label} 고르기</h2>
          <button type="button" className="btn ghost" onClick={onClose}>닫기</button>
        </div>
        <p className="muted picker-sub">
          {slot === 'DH' ? '지명타자는 모든 타자 중에서 고를 수 있어요.' : slot === 'CL' ? '마무리 투수만, 세이브가 많은 순이에요.' : slot === 'MR' ? '중간 투수만 고를 수 있어요.' : slot === 'SP' ? '선발 투수만 고를 수 있어요.' : `${label}만 고를 수 있어요.`}
        </p>
        <ul className="picker-list">
          {list.map((p, i) => {
            const at = slotOf(lineup, p.id)
            const here = at === slot
            const elsewhere = at !== null && !here
            const stat = bullpenStat(slot, p)
            return (
              <li key={p.id}>
                <button type="button" ref={i === 0 ? first : undefined} className={`pick-row${here ? ' here' : ''}`} disabled={elsewhere} onClick={() => onPick(p)}>
                  <span className="pick-name">{p.name}{here && <small> · 지금 이 자리</small>}</span>
                  <span className="pick-meta">
                    {p.team}
                    {elsewhere && <b> · {SLOT_LABEL[at]} 자리에 있어요</b>}
                  </span>
                  <span className="pick-nums">
                    <span>{formatWon(playerValue(league, p).total)}</span>
                    <span>WAR {p.m.WAR.toFixed(2)}</span>
                    {stat && <span>{stat}</span>}
                  </span>
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

/** 「내 라인업」: 야구장에 12자리를 고르고, 타순을 정하고, 저장한다 */
export default function MyLineup() {
  const league = useLeague()
  const { roles } = useLineupBasis()
  const store = useLineupStore()
  const requireLogin = useRequireLogin()
  const ready = store.status === 'ready'
  const saved = useMemo(() => (ready ? sanitize(store.mine, league, roles) : emptyLineup()), [ready, store, league, roles])
  // 로그인하러 갔다 돌아오면 써 두던 라인업을 다시 채운다
  const [draft, setDraft] = useState<Lineup | null>(() => {
    const raw = peekDraft()
    return raw ? sanitize(raw, league, roles) : null
  })
  useEffect(dropDraft, [])
  const lineup = draft ?? saved
  const dirty = draft !== null && !sameLineup(draft, saved)
  const [open, setOpen] = useState<LineupSlot | null>(null)
  const [note, setNote] = useState<{ text: string; warn: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const lastButton = useRef<HTMLElement | null>(null)

  const nameOf = (id: PlayerId | null) => (id ? (league.byId.get(id)?.name ?? null) : null)
  const fieldSlots: FieldSlot[] = [...HITTER_SLOTS, ...PITCHER_SLOTS].map((slot) => ({ slot, name: nameOf(lineup.slots[slot]), order: battingOrder(lineup, slot) }))
  const totals = lineupTotals(lineup, league)

  const close = useCallback(() => {
    setOpen(null)
    lastButton.current?.focus()
  }, [])
  const pick = (p: Player) => {
    if (!open) return
    const r = place(lineup, open, p, roles)
    if (!r.ok) {
      setNote({ text: r.reason === 'duplicate' ? `${p.name}은(는) 이미 ${SLOT_LABEL[r.at]} 자리에 있어요.` : `${p.name}은(는) ${SLOT_LABEL[open]} 자리에 넣을 수 없어요.`, warn: true })
      return
    }
    setDraft(r.lineup)
    setNote(null)
    close()
  }

  async function save() {
    if (!ready) return
    if (!requireLogin(store.user, { draft: { key: 'lineup', text: JSON.stringify(lineup) } })) return
    const bad = problems(lineup, league, roles)
    if (bad.length) {
      setNote({ text: bad.join(' / '), warn: true })
      return
    }
    setBusy(true)
    try {
      await store.repo.save(lineup)
      setDraft(null)
      setNote({ text: '저장했어요. 포지션별 픽 순위에 바로 반영돼요.', warn: false })
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : '저장하지 못했어요.', warn: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="my-lineup">
      <Field
        slots={fieldSlots}
        onSelect={(slot) => {
          lastButton.current = document.activeElement as HTMLElement | null
          setOpen(slot)
        }}
      />

      <div className="lineup-side">
        <section aria-labelledby="order-h">
          <h2 id="order-h">타순</h2>
          {lineup.order.length ? (
            <ol className="order-list">
              {lineup.order.map((slot: HitterSlot, i) => {
                const name = nameOf(lineup.slots[slot])!
                return (
                  <li key={slot}>
                    <span className="order-no">{i + 1}</span>
                    <span className="order-name">{name} <small>{SLOT_LABEL[slot]}</small></span>
                    <button type="button" className="order-btn" aria-label={`${name} 타순 올리기`} disabled={i === 0} onClick={() => setDraft(moveOrder(lineup, slot, -1))}>▲</button>
                    <button type="button" className="order-btn" aria-label={`${name} 타순 내리기`} disabled={i === lineup.order.length - 1} onClick={() => setDraft(moveOrder(lineup, slot, 1))}>▼</button>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="muted">타자 자리를 채우면 채운 순서대로 타순이 붙어요. ▲▼로 바꿀 수 있어요.</p>
          )}
          {/* 「선발 투수 –」처럼 자리 이름과 선수를 한 덩어리로 묶어, 줄이 바뀌어도 「–」만 따로 넘어가지 않게 한다 */}
          <p className="muted order-pitchers">
            <span className="op-lead">투수는 타순이 없어요</span>
            {PITCHER_SLOTS.map((s) => (
              <span key={s} className="op-item">{SLOT_LABEL[s]} <b>{nameOf(lineup.slots[s]) ?? '–'}</b></span>
            ))}
          </p>
        </section>

        <section className="lineup-total" aria-label="라인업 합계">
          <div><span>총 예상 가치</span><b>{formatWon(totals.value)}</b></div>
          <div><span>총 WAR</span><b>{totals.war.toFixed(2)}</b></div>
          <div><span>채운 자리</span><b>{totals.filled} / 12</b></div>
          <p className="lineup-disclaimer">실제 연봉과 무관합니다.</p>
        </section>

        <div className="lineup-actions">
          <button type="button" className="btn" disabled={!ready || busy} onClick={() => void save()}>저장</button>
          <button type="button" className="btn ghost" disabled={!ready || totals.filled === 0} onClick={() => { setDraft(emptyLineup()); setNote({ text: '비웠어요. 저장하면 저장된 라인업도 비워져요.', warn: false }) }}>비우기</button>
          <p className={`lineup-note${note?.warn ? ' warn' : ''}`} role="status">
            {note?.text ?? (dirty ? '저장하지 않은 변경이 있어요.' : ready && !store.user ? '저장하려면 로그인이 필요해요. 고르는 것은 로그인 없이 할 수 있어요.' : '')}
          </p>
        </div>
      </div>

      {open && (
        <Picker
          slot={open}
          lineup={lineup}
          onPick={pick}
          onClear={() => { setDraft(clearSlot(lineup, open)); close() }}
          onClose={close}
        />
      )}
    </div>
  )
}
