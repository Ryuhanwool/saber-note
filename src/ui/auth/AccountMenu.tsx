import { Link, useLocation } from 'react-router'
import ProfileMenu from '../hub/ProfileMenu'
import { useAuth } from './AuthContext'
import { loginPath } from './login'
import './auth.css'

/** 아이콘 줄 끝: 로그인했으면 내 프로필(엠블럼 동그라미 → 작은 창, 로그아웃은 그 창 안), 아니면 「로그인」 */
export default function AccountMenu() {
  const auth = useAuth()
  const { pathname, search } = useLocation()
  if (auth.status !== 'ready' || !auth.repo) return null
  const repo = auth.repo
  if (!auth.account) {
    if (pathname === '/login' || pathname === '/signup') return null
    return <Link className="acct" to={loginPath(pathname + search)}>로그인</Link>
  }
  return <ProfileMenu account={auth.account} onSignOut={() => void repo.signOut()} />
}
