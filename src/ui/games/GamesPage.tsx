import { useNavigate, useParams } from 'react-router'
import { gameBlockers, GAMES, type GameId } from '../../domain/games/catalog'
import { useDataSource, useLeague } from '../shared/LeagueContext'
import BattedBallGame from './BattedBallGame'
import BlindGame from './BlindGame'
import ChallengeGame from './ChallengeGame'
import UpDownGame from './UpDownGame'
import './games.css'

const SCREENS: Record<GameId, () => React.JSX.Element> = {
  updown: UpDownGame,
  blind: BlindGame,
  challenge: ChallengeGame,
  'batted-ball': BattedBallGame,
}

function GamesHome({ blockers }: { blockers: Record<GameId, string | null> }) {
  const navigate = useNavigate()
  return (
    <>
      {!blockers.challenge && (
        <div className="banner">
          <div><b>이번 주 세이버 픽 챌린지</b> <span className="muted">마감까지 1일 3시간 (데모 표시)</span></div>
          <button className="btn" onClick={() => navigate('/games/challenge')}>참여하기</button>
        </div>
      )}
      <div className="games">
        {GAMES.map((g) => (
          <button key={g.id} className="gcard" disabled={Boolean(blockers[g.id])} onClick={() => navigate(`/games/${g.id}`)}>
            <span className="display">{g.name}</span>
            <span className="t">{g.time}</span>
            <span>{blockers[g.id] ?? g.desc}</span>
          </button>
        ))}
      </div>
    </>
  )
}

/** 화면 6. 미니게임 */
export default function GamesPage() {
  const league = useLeague()
  const source = useDataSource()
  const navigate = useNavigate()
  const { game } = useParams()
  const blockers = gameBlockers(league, Boolean(source.loadWeek))
  if (!game) return <GamesHome blockers={blockers} />

  const id = game as GameId
  const Screen = SCREENS[id]
  return (
    <>
      <button className="back" onClick={() => navigate('/games')}>‹ 미니게임 목록</button>
      {!Screen ? (
        <p className="empty">없는 게임이에요.</p>
      ) : blockers[id] ? (
        <p className="empty">{blockers[id]}</p>
      ) : (
        <Screen />
      )}
    </>
  )
}
