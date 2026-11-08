import { Link, useLocation } from 'react-router'
import { useAuth } from './AuthContext'
import { loginPath } from './login'
import './auth.css'

/** 상단 메뉴의 로그인 상태: 닉네임 + 로그아웃, 또는 로그인 */
export default function AccountMenu() {
  const auth = useAuth()
  const { pathname, search } = useLocation()
  if (auth.status !== 'ready' || !auth.repo) return null
  const repo = auth.repo
  if (!auth.account) {
    if (pathname === '/login' || pathname === '/signup') return null
    return <Link className="acct" to={loginPath(pathname + search)}>로그인</Link>
  }
  return (
    <span className="acct" aria-label="로그인 상태">
      <b>{auth.account.nickname}</b>
      <button className="linkbtn" onClick={() => void repo.signOut()}>로그아웃</button>
    </span>
  )
}
