import { useCallback, useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { Account } from '../../data/types'
import { FAN_ACTIVITY_LABEL, FAN_DAILY_LIMIT, FAN_KINDS, FAN_LEVELS, FAN_POINTS, fanActivities, fanLevel, fanScore, startPoints } from '../../domain/hub/level'
import { lineupTotals, sanitize } from '../../domain/lineup/lineup'
import { LINEUP_SLOTS } from '../../domain/lineup/slots'
import { formatWon } from '../../domain/value/value'
import { useLineupStore } from '../lineup/LineupContext'
import { useLeagueState } from '../shared/LeagueContext'
import Emblem from './Emblem'
import { LogoutIcon } from './icons'
import ProfileImageDialog from './ProfileImageDialog'
import { useProfile } from './ProfileContext'
import { useHubData } from './useHubData'
import { usePopover } from './usePopover'

/** 내 라인업 총 예상 가치 (저장된 라인업 기준). 리그를 아직 불러오지 않았으면 null */
function useMyLineupTotals() {
  const state = useLeagueState()
  const store = useLineupStore()
  const mine = store.status === 'ready' ? store.mine : null
  return useMemo(() => {
    if (state.status !== 'ready' || !mine) return null
    return lineupTotals(sanitize(mine, state.league, state.roles), state.league)
  }, [state, mine])
}

/** 팬 레벨: 배지 · 다음 레벨까지 · 점수표(펼치기) */
function FanLevel({ account }: { account: Account }) {
  const d = useHubData()
  const store = useLineupStore()
  const mine = store.status === 'ready' ? store.mine : null
  const score = useMemo(() => {
    const acts = fanActivities({ userId: account.id, cheers: d.cheers, cheerMessages: d.cheerMessages, posts: d.posts, listings: d.listings, lineup: mine })
    return fanScore(acts, startPoints(account.id))
  }, [account, d.cheers, d.cheerMessages, d.posts, d.listings, mine])
  const lv = fanLevel(score.points)
  const pct = lv.next ? Math.round(((score.points - lv.min) / (lv.next.min - lv.min)) * 100) : 100
  return (
    <div className="pm-level">
      <span className="lv-badge"><span className="lv-no">Lv.{lv.level}</span> {lv.name}</span>
      <p className="pm-next">
        {score.points}점 · {lv.next ? <>Lv.{lv.next.level} {lv.next.name}까지 <b>{lv.toNext}점</b></> : <b>가장 높은 레벨이에요!</b>}
      </p>
      <div className="lv-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
      <details className="pm-table">
        <summary>점수표 보기</summary>
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
          {score.start > 0 && ` 데모 계정은 시연용으로 ${score.start}점에서 시작해요.`} 지운 글과 신고로 가려진 글은 세지 않아요.
        </p>
      </details>
    </div>
  )
}

/**
 * 아이콘 줄 끝의 내 프로필 (로그인했을 때): 구단 엠블럼(또는 내 프로필 사진) 동그라미.
 * 누르면 작은 창 — 닉네임 · 팬 레벨 · 내 라인업 총 예상 가치 · 「라인업 편집」 · 「프로필 이미지 바꾸기」 · 「로그아웃」
 */
export default function ProfileMenu({ account, onSignOut }: { account: Account; onSignOut: () => void }) {
  const profile = useProfile()
  const imageUrl = profile.status === 'ready' ? profile.imageUrl : null
  const totals = useMyLineupTotals()
  const { open, setOpen, wrapRef, buttonRef } = usePopover<HTMLSpanElement>()
  const [editing, setEditing] = useState(false)
  const panelId = useId()
  const closeEditor = useCallback(() => {
    setEditing(false)
    buttonRef.current?.focus()
  }, [buttonRef])
  const has = Boolean(totals && totals.filled > 0)

  return (
    <span className="icon-wrap acct" ref={wrapRef} aria-label="로그인 상태">
      <button type="button" ref={buttonRef} className="avatar-btn" aria-label={`내 프로필 메뉴 (${account.nickname})`} title="내 프로필" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        <Emblem team={account.team} imageUrl={imageUrl} size={40} />
        <span className="sr-only">{account.nickname}</span>
      </button>
      {open && (
        <div className="hub-pop profile-pop panel" id={panelId} role="dialog" aria-label="내 프로필">
          <div className="pm-head">
            <Emblem team={account.team} imageUrl={imageUrl} size={52} />
            <div className="pm-who">
              <b className="pm-name">{account.nickname}</b>
              <span className="muted pm-team">{account.team ?? '응원 팀 없음'}</span>
            </div>
          </div>
          <FanLevel account={account} />
          <section className="pm-lineup" aria-label="내 라인업">
            <span className="pm-label">내 라인업 총 예상 가치</span>
            {has && totals ? (
              <>
                <b className="pm-value">{formatWon(totals.value)}</b>
                <span className="muted pm-sub">{LINEUP_SLOTS.length}자리 중 {totals.filled}자리 · WAR {totals.war.toFixed(2)}</span>
              </>
            ) : (
              <span className="pm-sub">아직 저장한 라인업이 없어요.</span>
            )}
            <span className="pm-disclaimer">실제 연봉과 무관합니다.</span>
            <Link className="btn ghost pm-btn" to="/lineup" onClick={() => setOpen(false)}>{has ? '라인업 편집' : '라인업 만들기'}</Link>
          </section>
          <div className="pm-actions">
            <button type="button" className="btn ghost pm-btn" onClick={() => { setOpen(false); setEditing(true) }}>프로필 이미지 바꾸기</button>
            <button type="button" className="btn ghost pm-btn" onClick={() => { setOpen(false); onSignOut() }}>
              <LogoutIcon size={18} /> 로그아웃
            </button>
          </div>
        </div>
      )}
      {editing && <ProfileImageDialog team={account.team} onClose={closeEditor} />}
    </span>
  )
}
