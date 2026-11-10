import { useId } from 'react'
import { useNavigate } from 'react-router'
import { useLeagueState } from '../shared/LeagueContext'
import { playerPath } from '../shared/labels'
import SearchBox from '../shared/SearchBox'
import { SearchIcon } from './icons'
import { usePopover } from './usePopover'

/** 아이콘 줄 「선수 검색」: 어느 화면에서나 선수 이름 검색 창을 띄운다 */
export default function SearchButton() {
  const state = useLeagueState()
  const navigate = useNavigate()
  const { open, setOpen, wrapRef, buttonRef } = usePopover()
  const panelId = useId()
  if (state.status !== 'ready') return null
  return (
    <div className="icon-wrap" ref={wrapRef}>
      <button type="button" ref={buttonRef} className="icon-btn" aria-label="선수 검색" title="선수 검색" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        <SearchIcon />
      </button>
      {open && (
        <div className="hub-pop hub-search panel" id={panelId} role="dialog" aria-label="선수 검색">
          <h2>선수 검색</h2>
          <SearchBox
            label="선수 이름 검색 (검색 창)"
            autoFocus
            placeholder="선수 이름이나 팀"
            onPick={(p) => {
              setOpen(false)
              navigate(playerPath(p.id))
            }}
            emptyText={(q) => `“${q}”와 맞는 선수가 없어요.`}
          />
        </div>
      )}
    </div>
  )
}
