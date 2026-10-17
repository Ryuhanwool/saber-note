import { NavLink, Outlet } from 'react-router'

const NAV = [
  { to: '/', label: '선수', end: true },
  { to: '/compare', label: '비교' },
  { to: '/games', label: '미니게임' },
  { to: '/community', label: '커뮤니티' },
]

export default function Layout() {
  return (
    <>
      <header>
        <div className="bar">
          <div className="brand display">세이버 노트<small>데모</small></div>
          <nav aria-label="주요 메뉴">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="app">
        <Outlet />
      </main>
    </>
  )
}
