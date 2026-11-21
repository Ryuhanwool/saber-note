import { useMemo } from 'react'
import { Link } from 'react-router'
import { gameBlockers } from '../../domain/games/catalog'
import { topCheered } from '../../domain/cheer/cheer'
import { teamTopRow } from '../../domain/hub/home'
import { recentCount } from '../../domain/hub/news'
import { changeDirection, rankChangeLabel } from '../../domain/value/ranking'
import { formatWon } from '../../domain/value/value'
import { challengeSchedule, formatRemaining } from '../../domain/games/schedule'
import { useYesterday } from '../ranking/useYesterday'
import { useDataSource, useLeague, useLeagueDay } from '../shared/LeagueContext'
import { cheerPath } from '../shared/labels'
import { useNow } from '../shared/useNow'
import { CheerArt, CompareArt, GamesArt, RankingArt } from './cardArt'
import { useHubData } from './useHubData'
import '../ranking/ranking.css'

/** 순위 변화를 화면 읽기 프로그램용 문장으로 */
const changeText = (n: number | null) => {
  const d = changeDirection(n)
  return d === 'new' ? '새로 진입' : d === 'same' ? '순위 변동 없음' : `전날보다 ${Math.abs(n!)}계단 ${d === 'up' ? '상승' : '하락'}`
}

function RankingCard({ team }: { team: string | null }) {
  const league = useLeague()
  const day = useLeagueDay()
  const yesterday = useYesterday(day?.date ?? null)
  const top = useMemo(() => teamTopRow(league, yesterday.league, team), [league, yesterday.league, team])
  const compare = Boolean(day) && yesterday.ready
  return (
    <Link className="hub-card wide" to="/ranking" style={{ gridArea: 'rank' }}>
      <span className="card-body">
        <span className="card-title display">선수 가치 순위</span>
        {top ? (
          <>
            <span className="card-sub">{top.scope === 'team' ? `${team} 1위 · 전체 ${top.row.rank}위` : '전체 1위'}</span>
            <span className="card-big">{top.row.player.name} <small>{formatWon(top.row.value.total)}</small></span>
            {compare && (
              <span className="card-line">
                오늘 순위 변화{' '}
                <span className={`rk-chg ${changeDirection(top.row.rankChange)}`} aria-hidden="true">{rankChangeLabel(top.row)}</span>
                <span className="sr-only">{changeText(top.row.rankChange)}</span>
              </span>
            )}
          </>
        ) : (
          <span className="card-sub">순위를 계산할 선수가 없어요.</span>
        )}
      </span>
      <RankingArt />
    </Link>
  )
}

function GamesCard() {
  const league = useLeague()
  const source = useDataSource()
  const blocked = gameBlockers(league, Boolean(source.loadWeek)).challenge
  const now = useNow()
  const sched = challengeSchedule(now)
  return (
    <Link className="hub-card wide" to="/games" style={{ gridArea: 'games' }}>
      <span className="card-body">
        <span className="card-title display">미니게임</span>
        {blocked ? (
          <span className="card-sub">지표 업다운 · 블라인드 퀴즈로 지표와 친해져요.</span>
        ) : (
          <>
            <span className="card-sub">이번 주 세이버 픽 챌린지</span>
            <span className="card-big">{sched.phase === 'open' ? `마감까지 ${formatRemaining(sched.deadline - now)}` : '제출 마감'}</span>
            <span className="card-line">{sched.phase === 'open' ? '매주 화요일 18:30(한국 시간) 마감' : '일요일 경기 뒤 채점'}</span>
          </>
        )}
      </span>
      <GamesArt />
    </Link>
  )
}

/** 이번 주 응원 1위 선수 (최근 7일 「응원하기」 수) → 그 선수 응원방 */
function CheerCard() {
  const league = useLeague()
  const d = useHubData()
  const now = useNow()
  const top = useMemo(() => {
    const t = topCheered(d.cheers, [...league.hitters, ...league.pitchers], now, 1)[0]
    return t ? { player: league.byId.get(t.id)!, count: t.count } : null
  }, [d.cheers, league, now])
  const to = top ? cheerPath(top.player.id) : '/community'
  return (
    <Link className="hub-card half" to={to} style={{ gridArea: 'cheer' }}>
      <span className="card-body">
        <span className="card-title display">응원 순위</span>
        {top ? (
          <>
            <span className="card-big">{top.player.name}</span>
            <span className="card-line">이번 주 응원 1위 · {top.count}번</span>
          </>
        ) : (
          <span className="card-line">{d.cheerReady ? '이번 주 응원이 아직 없어요' : '불러오는 중…'}</span>
        )}
      </span>
      <CheerArt />
    </Link>
  )
}

/**
 * 홈 카드 메뉴: 아래쪽 탭 바에 없는 기능 위주 — 가치 순위·미니게임(넓은 카드) + 선수 비교·응원 순위(반쪽 카드).
 * 휴대폰 폭에서는 넷 다 반쪽 카드 2×2. 커뮤니티·마켓(탭 바에 있음)은 아래 한 줄로 새 글 수만.
 */
export default function HomeCards() {
  const d = useHubData()
  const now = useNow()
  const team = d.account?.team ?? null
  return (
    <section className="hub-cards-wrap" aria-label="홈 메뉴">
      <div className="hub-cards">
        <RankingCard team={team} />
        <GamesCard />
        <Link className="hub-card half" to="/compare" style={{ gridArea: 'comp' }}>
          <span className="card-body">
            <span className="card-title display">선수 비교</span>
            <span className="card-line">두 선수 지표를 나란히</span>
          </span>
          <CompareArt />
        </Link>
        <CheerCard />
      </div>
      <p className="hub-news-line">
        <Link to="/community">커뮤니티 새 글 <b>{d.postsReady ? `${recentCount(d.posts, now)}개` : '…'}</b></Link>
        <span aria-hidden="true">·</span>
        <Link to="/market">마켓 새 판매글 <b>{d.marketReady ? `${recentCount(d.listings, now)}개` : '…'}</b></Link>
        <span className="muted">(최근 24시간)</span>
      </p>
    </section>
  )
}
