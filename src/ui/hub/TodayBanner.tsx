import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { dayKeyKST, weekIdKST } from '../../domain/games/calendar'
import { gameBlockers } from '../../domain/games/catalog'
import { movers, rankChangeLabel, valueChangeLabel, valueRanking } from '../../domain/value/ranking'
import { teamTopRow } from '../../domain/hub/home'
import { formatWon } from '../../domain/value/value'
import ChallengeDeadline from '../games/ChallengeDeadline'
import { BLIND_DONE_KEY, CHALLENGE_SUBMITTED_KEY, localStore } from '../games/storage'
import { useYesterday } from '../ranking/useYesterday'
import { useDataSource, useLeague, useLeagueDay } from '../shared/LeagueContext'
import { cheerPath, playerPath, positionLabel } from '../shared/labels'
import { useNow } from '../shared/useNow'
import { useCheerToday } from './useCheerToday'
import { useHubData } from './useHubData'
import '../ranking/ranking.css'

/** 오늘의 급상승: 가치 순위 기준 전날보다 가장 많이 오른 선수 (순위 변화·금액 변화) */
function RiserCard() {
  const league = useLeague()
  const day = useLeagueDay()
  const yesterday = useYesterday(day?.date ?? null)
  const top = useMemo(() => (yesterday.league ? movers(valueRanking(league, yesterday.league)).up[0] ?? null : null), [league, yesterday.league])
  if (!day) {
    return (
      <Link className="today-card" to="/ranking">
        <span className="today-kind">오늘의 급상승</span>
        <span className="today-main">날짜별 기록이 없는 데이터예요</span>
        <span className="today-sub">가치 순위표 보기</span>
      </Link>
    )
  }
  if (!top) {
    return (
      <Link className="today-card" to="/ranking">
        <span className="today-kind">오늘의 급상승</span>
        <span className="today-main">{yesterday.ready ? '오늘은 가치가 오른 선수가 없어요' : '불러오는 중…'}</span>
        <span className="today-sub">가치 순위표 보기</span>
      </Link>
    )
  }
  return (
    <Link className="today-card" to={`${playerPath(top.player.id)}?tab=value`}>
      <span className="today-kind">오늘의 급상승</span>
      <span className="today-main">{top.player.name} <small>{top.player.team} · {positionLabel(top.player)}</small></span>
      <span className="today-sub">
        {top.prev!.rank}위 → {top.rank}위 <span className="rk-chg up">{rankChangeLabel(top)}</span>
        {' · '}{formatWon(top.value.total)} <span className="rk-chg up">{valueChangeLabel(top.valueChange)}</span>
      </span>
    </Link>
  )
}

/** 오늘의 블라인드 퀴즈: 누르면 퀴즈로, 오늘 문제를 끝냈으면 「오늘 퀴즈 완료」 */
function BlindCard({ now }: { now: number }) {
  const done = localStore.get(BLIND_DONE_KEY) === dayKeyKST(new Date(now))
  return (
    <Link className={`today-card${done ? ' done' : ''}`} to="/games/blind">
      <span className="today-kind">오늘의 블라인드 퀴즈</span>
      <span className="today-main">{done ? '오늘 퀴즈 완료' : '이 지표 카드의 주인공은?'}</span>
      <span className="today-sub">{done ? '내일 새 문제가 나와요 · 연습 문제 풀기' : '하루 1문제 · 모두 같은 문제'}</span>
    </Link>
  )
}

/** 세이버 픽 챌린지: 마감까지 남은 시간, 이번 주에 제출했으면 「제출 완료」 */
function ChallengeCard({ now }: { now: number }) {
  const submitted = localStore.get(CHALLENGE_SUBMITTED_KEY) === weekIdKST(new Date(now))
  return (
    <Link className={`today-card${submitted ? ' done' : ''}`} to="/games/challenge">
      <span className="today-kind">세이버 픽 챌린지</span>
      <span className="today-main">{submitted ? '제출 완료' : <ChallengeDeadline />}</span>
      <span className="today-sub">{submitted ? '일요일 경기 뒤 채점' : '매주 화요일 18:30(한국 시간) 마감'}</span>
    </Link>
  )
}

/** 오늘의 응원: 내 응원 팀 가치 1위(응원 팀이 없으면 전체 가치 1위) 선수 → 그 선수 응원방. 오늘 응원했으면 「오늘 응원 완료」 (홈 탭 점과 같은 기준) */
function CheerCard() {
  const league = useLeague()
  const d = useHubData()
  const { done, nudge } = useCheerToday()
  const team = d.account?.team ?? null
  const top = useMemo(() => teamTopRow(league, null, team), [league, team])
  if (!top) return null
  const p = top.row.player
  return (
    <Link className={`today-card${done ? ' done' : ''}`} to={cheerPath(p.id)}>
      <span className="today-kind">
        오늘의 응원{nudge && <span className="dot today-dot-new" aria-hidden="true" />}
        {nudge && <span className="sr-only">{' (오늘 아직 응원하지 않았어요)'}</span>}
      </span>
      <span className="today-main">{done ? '오늘 응원 완료' : <>{p.name} <small>{p.team} · {top.scope === 'team' ? '우리 팀 가치 1위' : '전체 가치 1위'}</small></>}</span>
      <span className="today-sub">{done ? `${p.name} 응원방 가기 · 내일 또 응원해요` : d.account ? '응원방에서 응원하기' : '로그인하고 응원하기'}</span>
    </Link>
  )
}

/**
 * 홈 「오늘의 소식」: 카드 4장(급상승 · 블라인드 퀴즈 · 챌린지 · 오늘의 응원).
 * 넓은 화면은 나란히, 휴대폰 폭은 옆으로 밀어 넘기고 몇 번째 카드인지 점으로 보여 준다.
 */
export default function TodayBanner() {
  const league = useLeague()
  const source = useDataSource()
  const now = useNow()
  const blockers = gameBlockers(league, Boolean(source.loadWeek))
  const cards = [
    <RiserCard key="riser" />,
    ...(blockers.blind ? [] : [<BlindCard key="blind" now={now} />]),
    ...(blockers.challenge ? [] : [<ChallengeCard key="challenge" now={now} />]),
    <CheerCard key="cheer" />,
  ]
  const cheerIndex = cards.length - 1
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  function onScroll() {
    const el = track.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setActive(max > 0 ? Math.round((el.scrollLeft / max) * (cards.length - 1)) : 0)
  }
  // 홈 탭의 응원 점을 눌러 오면 「오늘의 응원」 카드로 넘긴다
  const { state } = useLocation() as { state: { today?: string } | null }
  const wantCheer = state?.today === 'cheer'
  useEffect(() => {
    if (wantCheer) go(cheerIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantCheer])

  function go(i: number) {
    setActive(i)
    const el = track.current
    const card = el?.children[i] as HTMLElement | undefined
    if (el && card) el.scrollTo?.({ left: card.offsetLeft - el.offsetLeft, behavior: 'smooth' })
  }

  return (
    <section className="today" aria-labelledby="today-h">
      <h2 id="today-h" className="today-title">오늘의 소식</h2>
      <div className="today-track" ref={track} onScroll={onScroll}>
        {cards}
      </div>
      <div className="today-dots" role="group" aria-label="소식 카드 넘기기">
        {cards.map((c, i) => (
          <button key={c.key} type="button" className="today-dot" aria-label={`${i + 1}번째 소식 보기 (${cards.length}장 중)`} aria-current={active === i ? 'true' : undefined} onClick={() => go(i)} />
        ))}
      </div>
    </section>
  )
}
