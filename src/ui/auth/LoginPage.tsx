import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { CryptoUnavailableError, WrongCredentialsError } from '../../data/source'
import { useAuth } from './AuthContext'
import { CryptoNotice, SecurityNotice } from './AuthNotices'
import { safeNext } from './login'
import './auth.css'

/** 화면 15. 로그인 (?next=… 로그인한 뒤 돌아갈 화면) */
export default function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (auth.status === 'loading') return <p className="empty">불러오는 중이에요.</p>
  if (auth.status === 'error' || !auth.repo) return <div className="panel" role="alert"><h2>로그인을 열지 못했어요</h2></div>
  const repo = auth.repo

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      navigate(next, { replace: true })
    } catch (e) {
      setError(
        e instanceof WrongCredentialsError ? '닉네임이나 비밀번호가 맞지 않아요.'
          : e instanceof CryptoUnavailableError ? 'localhost나 https 주소로 접속해 주세요.'
          : '로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      )
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!nickname.trim() || !password) return setError('닉네임과 비밀번호를 써 주세요.')
    void run(() => repo.signIn(nickname, password))
  }

  return (
    <div className="panel authbox">
      <h1 className="display">로그인</h1>
      {params.get('next') && <p className="muted" style={{ margin: '0 0 12px' }}>로그인하면 하던 화면으로 돌아가요.</p>}
      {auth.account && (
        <p role="status">지금 <b>{auth.account.nickname}</b>(으)로 로그인돼 있어요.</p>
      )}
      {!repo.cryptoAvailable ? (
        <CryptoNotice />
      ) : (
        <>
          <form onSubmit={submit} className="authform">
            <label>닉네임<input value={nickname} onChange={(e) => setNickname(e.target.value)} autoComplete="username" /></label>
            <label>비밀번호<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
            {error && <p className="autherr" role="alert">{error}</p>}
            <button className="btn" type="submit" disabled={busy}>로그인</button>
          </form>
          <div className="author">또는</div>
          <button className="btn ghost wide" disabled={busy} onClick={() => void run(() => repo.signInDemo())}>데모 계정으로 체험하기</button>
          <p style={{ margin: '14px 0 0' }}>
            처음이세요? <Link to={`/signup?${new URLSearchParams({ next })}`}>회원가입</Link>
          </p>
        </>
      )}
      <SecurityNotice />
    </div>
  )
}
