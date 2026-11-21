import { useNavigate } from 'react-router'
import type { Player } from '../../domain/players'
import { topByWar } from '../../domain/search'
import { useLeague } from '../shared/LeagueContext'
import { playerPath } from '../shared/labels'
import SearchBox from '../shared/SearchBox'
import HomeCards from '../hub/HomeCards'
import TodayBanner from '../hub/TodayBanner'
import TopValueLine from '../hub/TopValueLine'
import './player.css'

/** 화면 1. 홈: 선수 검색 · 오늘의 소식 · 카드 메뉴 · 가치 순위 TOP 3 한 줄 (내 프로필은 아이콘 줄 끝의 엠블럼 메뉴) */
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
      <section className="hero hub-search-hero" aria-labelledby="home-search-h">
        <h2 id="home-search-h" className="sr-only">선수 검색</h2>
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
      <TodayBanner />
      <HomeCards />
      <TopValueLine />
    </div>
  )
}
