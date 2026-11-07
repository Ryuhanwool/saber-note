import { useId, useState, type KeyboardEvent } from 'react'
import type { PlayerId } from '../../data/types'
import type { Player } from '../../domain/players'
import { searchPlayers } from '../../domain/search'
import { useLeague } from './LeagueContext'
import { positionLabel } from './labels'

type Props = {
  /** 입력칸의 접근성 이름 */
  label: string
  placeholder: string
  onPick: (p: Player) => void
  /** 목록에서 뺄 선수 (예: 이미 태그한 선수) */
  exclude?: readonly PlayerId[]
  emptyText?: (query: string) => string
  /** 고른 뒤 입력칸을 비운다 */
  clearOnPick?: boolean
  limit?: number
}

/** 선수 이름 검색 + 자동완성 (이름 · 팀 · 포지션). ↑↓로 고르고 Enter로 열기, Esc로 닫기 */
export default function SearchBox({ label, placeholder, onPick, exclude = [], emptyText, clearOnPick, limit = 8 }: Props) {
  const league = useLeague()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const hits = searchPlayers(league, query, limit + exclude.length).filter((p) => !exclude.includes(p.id)).slice(0, limit)
  const showList = open && query.trim() !== ''

  function pick(p: Player) {
    onPick(p)
    if (clearOnPick) {
      setQuery('')
      setOpen(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown' && hits.length) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % hits.length)
    } else if (e.key === 'ArrowUp' && hits.length) {
      e.preventDefault()
      setActive((i) => (i - 1 + hits.length) % hits.length)
    } else if (e.key === 'Enter' && showList && hits[active]) {
      e.preventDefault()
      pick(hits[active])
    }
  }

  return (
    <div className="search">
      <input
        type="search"
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul className="ac" id={listId} role="listbox" aria-label="검색 결과">
          {hits.length ? (
            hits.map((p, i) => (
              <li key={p.id}>
                <button role="option" aria-selected={i === active} onClick={() => pick(p)}>
                  <span>{p.name}</span>
                  <span className="muted">{p.team}, {positionLabel(p)}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="muted" style={{ padding: '8px 10px' }}>
              {emptyText ? emptyText(query.trim()) : `“${query.trim()}”와 맞는 선수가 없어요.`}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
