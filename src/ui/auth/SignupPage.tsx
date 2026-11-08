import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { CryptoUnavailableError, NicknameTakenError } from '../../data/source'
import { checkNickname, checkPassword, NICKNAME_MAX, NICKNAME_MIN, nicknameKey, PASSWORD_MIN } from '../../domain/auth/account'
import { teamsOf } from '../../domain/market/catalog'
import { teamThemeId } from '../../domain/theme/teams'
import { THEMES } from '../../domain/theme/themes'
import { useSettings } from '../settings/SettingsContext'
import { useLeague } from '../shared/LeagueContext'
import { useAuth } from './AuthContext'
import { CryptoNotice, SecurityNotice } from './AuthNotices'
import { safeNext } from './login'
import './auth.css'

/** 화면 16. 회원가입: 닉네임 · 비밀번호 · 비밀번호 확인 · 응원 팀(선택, 고르면 팀 컬러 테마 적용) */
export default function SignupPage() {
  const auth = useAuth()
  const league = useLeague()
  const settings = useSettings()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const teams = useMemo(() => teamsOf([...league.hitters, ...league.pitchers]), [league])
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [team, setTeam] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (auth.status === 'loading') return <p className="empty">불러오는 중이에요.</p>
  if (auth.status === 'error' || !auth.repo) return <div className="panel" role="alert"><h2>회원가입을 열지 못했어요</h2></div>
  const repo = auth.repo
  const themeName = (t: string) => THEMES.find((x) => x.id === teamThemeId(teams, t))?.name

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const taken = new Set((await repo.nicknames()).map(nicknameKey))
    const n = checkNickname(nickname, taken)
    if (!n.ok) return setError(n.message)
    const p = checkPassword(password, confirm)
    if (!p.ok) return setError(p.message)
    setBusy(true)
    try {
      await repo.signUp({ nickname: n.value, password: p.value, team: team || null })
      const themeId = team ? teamThemeId(teams, team) : null
      if (themeId) await settings?.update({ themeId })
      navigate(next, { replace: true })
    } catch (err) {
      setError(
        err instanceof NicknameTakenError ? '이미 이 브라우저에서 쓰고 있는 닉네임이에요.'
          : err instanceof CryptoUnavailableError ? 'localhost나 https 주소로 접속해 주세요.'
          : '가입하지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="panel authbox">
      <h1 className="display">회원가입</h1>
      {!repo.cryptoAvailable ? (
        <CryptoNotice />
      ) : (
        <form onSubmit={(e) => void submit(e)} className="authform">
          <label>닉네임
            <input value={nickname} maxLength={NICKNAME_MAX + 4} onChange={(e) => setNickname(e.target.value)} autoComplete="username" />
            <small className="muted">{NICKNAME_MIN}~{NICKNAME_MAX}자, 한글·영문·숫자·밑줄. 커뮤니티 작성 제한이 적용되고 이 브라우저 안에서 겹치지 않아야 해요.</small>
          </label>
          <label>비밀번호
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <small className="muted">{PASSWORD_MIN}자 이상</small>
          </label>
          <label>비밀번호 확인<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></label>
          <label>응원 팀 (선택)
            <select value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">고르지 않음</option>
              {teams.map((t) => <option key={t} value={t}>{t} · {themeName(t)} 테마</option>)}
            </select>
            <small className="muted">고르면 그 팀 컬러 테마가 바로 적용돼요. 화면 설정에서 언제든 바꿀 수 있어요.</small>
          </label>
          {error && <p className="autherr" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>가입하기</button>
        </form>
      )}
      <p style={{ margin: '14px 0 0' }}>이미 계정이 있으세요? <Link to={`/login?${new URLSearchParams({ next })}`}>로그인</Link></p>
      <SecurityNotice />
    </div>
  )
}
