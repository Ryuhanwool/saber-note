import { Link, useLocation } from 'react-router'
import { useAuth } from './AuthContext'
import { LogoutIcon } from '../hub/icons'
import { loginPath } from './login'
import './auth.css'

/** 아이콘 줄 끝의 로그인 상태: 닉네임(넓은 화면) + 로그아웃 아이콘, 또는 「로그인」 */
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
      <b className="acct-name">{auth.account.nickname}</b>
      <button type="button" className="icon-btn" aria-label="로그아웃" title="로그아웃" onClick={() => void repo.signOut()}>
        <LogoutIcon />
      </button>
    </span>
  )
}
