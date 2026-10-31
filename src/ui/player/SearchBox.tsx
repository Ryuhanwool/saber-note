import { useId, useState, type KeyboardEvent } from 'react'
import type { Player } from '../../domain/players'
import { searchPlayers } from '../../domain/search'
import { useLeague } from '../shared/LeagueContext'
import { positionLabel } from '../shared/labels'

type Props = { placeholder: string; onPick: (p: Player) => void }

/** 선수 이름 검색 + 자동완성 (이름 · 팀 · 포지션). ↑↓로 고르고 Enter로 열기, Esc로 닫기 */
export default function SearchBox({ placeholder, onPick }: Props) {
  const league = useLeague()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const hits = searchPlayers(league, query)
  const showList = open && query.trim() !== ''

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
      onPick(hits[active])
    }
  }

  return (
    <div className="search">
      <input
        type="search"
        placeholder={placeholder}
        aria-label="선수 이름 검색"
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
                <button role="option" aria-selected={i === active} onClick={() => onPick(p)}>
                  <span>{p.name}</span>
                  <span className="muted">{p.team}, {positionLabel(p)}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="muted" style={{ padding: '8px 10px' }}>
              “{query.trim()}”와 맞는 선수가 없어요. 아래의 많이 찾은 선수부터 눌러 보세요.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
