import { formatDayKey } from '../../domain/games/calendar'
import DemoReset from '../community/DemoReset'
import { useLeagueDay } from '../shared/LeagueContext'
import MyLineup from './MyLineup'
import './lineup.css'

/** 상단 메뉴 「라인업」: 나만의 라인업 (올스타 투표처럼 포지션마다 선수 고르기) */
export default function LineupPage() {
  const day = useLeagueDay()
  return (
    <>
      <div className="panel lineup-page">
        <h1 className="display">나만의 라인업</h1>
        <p className="muted lineup-sub">
          올스타 투표처럼 포지션마다 선수를 골라 보세요. 자리를 누르면 그 포지션 선수 목록이 떠요.
          {day && ` 예상 가치·WAR·세이브·홀드는 ${formatDayKey(day.date)} 기준이에요.`}
        </p>
        <MyLineup />
      </div>
      <DemoReset />
    </>
  )
}
