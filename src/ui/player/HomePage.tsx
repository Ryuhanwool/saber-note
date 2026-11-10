import { useNavigate } from 'react-router'
import { formatMetric } from '../../domain/format'
import type { Player } from '../../domain/players'
import { topByWar } from '../../domain/search'
import { useLeague } from '../shared/LeagueContext'
import { playerPath } from '../shared/labels'
import SearchBox from '../shared/SearchBox'
import HomeCards from '../hub/HomeCards'
import LineupBand from '../hub/LineupBand'
import ProfileRow from '../hub/ProfileRow'
import './player.css'

function RankList({ title, players, onPick }: { title: string; players: Player[]; onPick: (p: Player) => void }) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      <ol className="rank">
        {players.map((p, i) => (
          <li key={p.id}>
            <button onClick={() => onPick(p)}>
              <span className="n">{i + 1}</span>
              <span>{p.name} <span className="muted">{p.team}</span></span>
              <b>{formatMetric('WAR', p.m.WAR)}</b>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** 화면 1. 홈: 프로필 줄 · 내 라인업 띠 · 선수 검색 · 카드 메뉴 · WAR 상위 목록 */
export default function HomePage() {
  const league = useLeague()
  const navigate = useNavigate()
  const open = (p: Player) => navigate(playerPath(p.id))
  const topH = topByWar(league.hitters, 5)
  const topP = topByWar(league.pitchers, 5)
  // 실제 조회 수 집계가 생기기 전까지는 데모처럼 WAR 상위 선수로 채운다
  const popular = [topH[0], topP[0], topH[3]].filter(Boolean)

  return (
    <div className="hub-home">
      <h1 className="sr-only">세이버 노트 홈</h1>
      <div className="hub-top">
        <ProfileRow />
        <LineupBand />
      </div>
      <section className="hero hub-search-hero" aria-labelledby="home-search-h">
        <h2 id="home-search-h" className="display">궁금한 선수를 찾아보세요</h2>
        <SearchBox
          label="선수 이름 검색"
          placeholder={`예: ${topH[1]?.name ?? '선수 이름'}`}
          onPick={open}
          emptyText={(q) => `“${q}”와 맞는 선수가 없어요. 아래의 많이 찾은 선수부터 눌러 보세요.`}
        />
        <div className="popular">
          <span className="muted">오늘 많이 찾은 선수</span>
          {popular.map((p) => (
            <button key={p.id} className="chip" onClick={() => open(p)}>{p.name}</button>
          ))}
        </div>
      </section>
      <HomeCards />
      <div className="lists">
        <RankList title="WAR 상위 타자" players={topH} onPick={open} />
        <RankList title="WAR 상위 투수" players={topP} onPick={open} />
      </div>
    </div>
  )
}
