import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { FAN_ACTIVITY_LABEL, FAN_DAILY_LIMIT, FAN_KINDS, FAN_LEVELS, FAN_POINTS, fanActivities, fanLevel, fanScore, startPoints, weeklyCheers } from '../../domain/hub/level'
import { sanitize, lineupTotals } from '../../domain/lineup/lineup'
import { teamTopRow } from '../../domain/hub/home'
import { formatWon } from '../../domain/value/value'
import { loginPath } from '../auth/login'
import { useLineupStore } from '../lineup/LineupContext'
import { useLeague, useLineupBasis } from '../shared/LeagueContext'
import { cheerPath } from '../shared/labels'
import { useNow } from '../shared/useNow'
import Emblem from './Emblem'
import ProfileImageDialog from './ProfileImageDialog'
import { useProfile } from './ProfileContext'
import { useHubData } from './useHubData'
import { usePopover } from './usePopover'

/** 팬 레벨 배지. 누르면 다음 레벨까지 남은 점수와 점수표 */
function LevelBadge({ points, start }: { points: number; start: number }) {
  const lv = fanLevel(points)
  const { open, setOpen, wrapRef, buttonRef } = usePopover<HTMLSpanElement>()
  const panelId = useId()
  return (
    <span className="lv-wrap" ref={wrapRef}>
      <button type="button" ref={buttonRef} className="lv-badge" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        <span className="lv-no">Lv.{lv.level}</span> {lv.name}
      </button>
      {open && (
        <div className="hub-pop lv-pop panel" id={panelId} role="dialog" aria-label="팬 레벨">
          <h2>팬 레벨 · {points}점</h2>
          <p className="lv-next">
            {lv.next ? <>다음 레벨 <b>Lv.{lv.next.level} {lv.next.name}</b>까지 <b>{lv.toNext}점</b></> : <b>가장 높은 레벨이에요!</b>}
          </p>
          <div className="lv-bar" aria-hidden="true">
            <span style={{ width: `${lv.next ? Math.round(((points - lv.min) / (lv.next.min - lv.min)) * 100) : 100}%` }} />
          </div>
          <table className="lv-table">
            <caption className="sr-only">활동별 점수</caption>
            <thead><tr><th scope="col">활동</th><th scope="col">점수</th><th scope="col">한도</th></tr></thead>
            <tbody>
              {FAN_KINDS.map((k) => (
                <tr key={k}>
                  <th scope="row">{FAN_ACTIVITY_LABEL[k]}</th>
                  <td>{FAN_POINTS[k]}점</td>
                  <td>{k === 'lineup' ? '1번' : `하루 ${FAN_DAILY_LIMIT[k]}번`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted hub-pop-note">
            {FAN_LEVELS.map((l) => `Lv.${l.level} ${l.name} ${l.min}점`).join(' · ')}.
            {start > 0 && ` 데모 계정은 시연용으로 ${start}점에서 시작해요.`} 지운 글과 신고로 가려진 글은 세지 않아요.
          </p>
        </div>
      )}
    </span>
  )
}

/** 홈 맨 위 프로필 줄: 엠블럼(또는 내 사진) · 닉네임 · 팬 레벨 | 내 라인업 총 가치 · 이번 주 응원 */
export default function ProfileRow() {
  const league = useLeague()
  const { roles } = useLineupBasis()
  const d = useHubData()
  const profile = useProfile()
  const lineup = useLineupStore()
  const now = useNow()
  const { pathname } = useLocation()
  const [editing, setEditing] = useState(false)
  const emblemRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => {
    setEditing(false)
    emblemRef.current?.focus()
  }, [])
  const account = d.account
  const mine = lineup.status === 'ready' ? lineup.mine : null

  const score = useMemo(() => {
    if (!account) return null
    const acts = fanActivities({ userId: account.id, cheers: d.cheers, cheerMessages: d.cheerMessages, posts: d.posts, listings: d.listings, lineup: mine })
    return fanScore(acts, startPoints(account.id))
  }, [account, d.cheers, d.cheerMessages, d.posts, d.listings, mine])

  if (!account) {
    return (
      <section className="profile-row" aria-label="내 프로필">
        <div className="profile-who">
          <Emblem team={null} size={60} />
          <div className="profile-text">
            <b className="profile-name">로그인해 주세요</b>
            <span className="muted profile-sub">로그인하면 팬 레벨을 올리고 라인업을 저장할 수 있어요.</span>
          </div>
        </div>
        <Link className="btn profile-login" to={loginPath(pathname)}>로그인</Link>
      </section>
    )
  }

  const team = account.team
  const imageUrl = profile.status === 'ready' ? profile.imageUrl : null
  const totals = mine ? lineupTotals(sanitize(mine, league, roles), league) : null
  const cheered = weeklyCheers(d.cheers, account.id, now)
  // 「이번 주 응원」을 누르면 응원 팀 가치 1위(응원 팀이 없으면 전체 가치 1위) 선수의 응원방으로
  const target = teamTopRow(league, null, team)?.row.player

  return (
    <section className="profile-row" aria-label="내 프로필">
      <div className="profile-who">
        <button type="button" ref={emblemRef} className="emblem-btn" aria-label="프로필 이미지 바꾸기" title="프로필 이미지 바꾸기" onClick={() => setEditing(true)}>
          <Emblem team={team} imageUrl={imageUrl} size={60} />
        </button>
        <div className="profile-text">
          <b className="profile-name">{account.nickname}</b>
          <span className="profile-meta">
            {score && <LevelBadge points={score.points} start={score.start} />}
            <span className="muted profile-team">{team ?? '응원 팀 없음'}</span>
          </span>
        </div>
      </div>
      <div className="profile-stats">
        <Link className="stat-chip" to="/lineup">
          <span className="stat-label">라인업 총 가치</span>
          <b className="stat-value">{totals && totals.filled ? formatWon(totals.value) : '–'}</b>
        </Link>
        {target ? (
          <Link className="stat-chip" to={cheerPath(target.id)} aria-label={`이번 주 응원 ${cheered}번 — ${target.name} 응원방으로`}>
            <span className="stat-label">이번 주 응원</span>
            <b className="stat-value">{cheered}</b>
          </Link>
        ) : (
          <span className="stat-chip"><span className="stat-label">이번 주 응원</span><b className="stat-value">{cheered}</b></span>
        )}
      </div>
      {editing && <ProfileImageDialog team={team} onClose={close} />}
    </section>
  )
}
