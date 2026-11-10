import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import BackgroundLayer from '../settings/BackgroundLayer'
import AccountMenu from '../auth/AccountMenu'
import SettingsButton from '../settings/SettingsButton'
import { formatDayKey } from '../../domain/games/calendar'
import { useLeagueState } from './LeagueContext'

const NAV = [
  // 선수 카드(/player/…)를 보는 동안에도 "선수" 메뉴를 현재 위치로 표시한다
  { to: '/', label: '선수', match: (path: string) => path === '/' || path.startsWith('/player/') },
  { to: '/compare', label: '비교', match: (path: string) => path.startsWith('/compare') },
  { to: '/ranking', label: '가치 순위', match: (path: string) => path.startsWith('/ranking') },
  { to: '/games', label: '미니게임', match: (path: string) => path.startsWith('/games') },
  { to: '/community', label: '커뮤니티', match: (path: string) => path.startsWith('/community') },
  { to: '/market', label: '마켓', match: (path: string) => path.startsWith('/market') },
]

export default function Layout() {
  const state = useLeagueState()
  const { pathname } = useLocation()

  // 화면이 바뀌면 맨 위로 (데모 go()와 같은 동작)
  useEffect(() => {
    window.scrollTo?.({ top: 0 })
  }, [pathname])

  return (
    <>
      <BackgroundLayer />
      <header>
        <div className="bar">
          <div className="brand display">세이버 노트<small>데모</small></div>
          <nav aria-label="주요 메뉴">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} aria-current={n.match(pathname) ? 'page' : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="bar-end">
            <AccountMenu />
            <SettingsButton />
          </div>
        </div>
      </header>
      {state.status === 'ready' && state.league.meta.notice && <p className="notice">{state.league.meta.notice}</p>}
      {state.status === 'ready' && state.day && !state.day.isToday && (
        <p className="demo-date" role="status">
          <b>시연용 날짜: {formatDayKey(state.day.date)} 기록을 보고 있어요</b> (실제 오늘은 {formatDayKey(state.day.today)})
          <button type="button" className="btn ghost" onClick={() => state.day!.setDate(null)}>오늘로</button>
        </p>
      )}
      <main id="app">
        {state.status === 'loading' && <p className="empty">기록을 불러오는 중이에요…</p>}
        {state.status === 'error' && (
          <div className="panel" role="alert">
            <h2>기록을 불러오지 못했어요</h2>
            <p className="muted">{state.message}</p>
          </div>
        )}
        {state.status === 'ready' && <Outlet />}
      </main>
    </>
  )
}
