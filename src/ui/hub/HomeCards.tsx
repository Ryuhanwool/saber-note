import { useMemo } from 'react'
import { Link } from 'react-router'
import { gameBlockers } from '../../domain/games/catalog'
import { teamTopRow } from '../../domain/hub/home'
import { recentCount } from '../../domain/hub/news'
import { changeDirection, rankChangeLabel } from '../../domain/value/ranking'
import { formatWon } from '../../domain/value/value'
import ChallengeDeadline from '../games/ChallengeDeadline'
import { useYesterday } from '../ranking/useYesterday'
import { useDataSource, useLeague, useLeagueDay } from '../shared/LeagueContext'
import { useNow } from '../shared/useNow'
import { CommunityArt, GamesArt, MarketArt, RankingArt } from './cardArt'
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
  return (
    <Link className="hub-card wide" to="/games" style={{ gridArea: 'games' }}>
      <span className="card-body">
        <span className="card-title display">미니게임</span>
        {blocked ? (
          <span className="card-sub">지표 업다운 · 블라인드 퀴즈로 지표와 친해져요.</span>
        ) : (
          <>
            <span className="card-sub">이번 주 세이버 픽 챌린지</span>
            <span className="card-big"><ChallengeDeadline /></span>
            <span className="card-line">매주 화요일 18:30(한국 시간) 마감</span>
          </>
        )}
      </span>
      <GamesArt />
    </Link>
  )
}

/** 홈 카드 메뉴: 넓은 카드 2개(가치 순위·미니게임) + 반쪽 카드 2개(커뮤니티·마켓), 아래 「선수 비교하기 ›」 */
export default function HomeCards() {
  const d = useHubData()
  const now = useNow()
  const team = d.account?.team ?? null
  return (
    <section className="hub-cards-wrap" aria-label="홈 메뉴">
      <div className="hub-cards">
        <RankingCard team={team} />
        <GamesCard />
        <Link className="hub-card half" to="/community" style={{ gridArea: 'comm' }}>
          <span className="card-body">
            <span className="card-title display">커뮤니티</span>
            <span className="card-big">{d.postsReady ? `${recentCount(d.posts, now)}개` : '…'}</span>
            <span className="card-line">최근 24시간 새 글</span>
          </span>
          <CommunityArt />
        </Link>
        <Link className="hub-card half" to="/market" style={{ gridArea: 'market' }}>
          <span className="card-body">
            <span className="card-title display">마켓</span>
            <span className="card-big">{d.marketReady ? `${recentCount(d.listings, now)}개` : '…'}</span>
            <span className="card-line">최근 24시간 새 판매글</span>
          </span>
          <MarketArt />
        </Link>
      </div>
      <Link className="hub-compare" to="/compare">선수 비교하기 <span aria-hidden="true">›</span></Link>
    </section>
  )
}
