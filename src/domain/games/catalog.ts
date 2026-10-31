import type { League } from '../players'

export type GameId = 'updown' | 'blind' | 'challenge' | 'batted-ball'

export const GAMES: { id: GameId; name: string; time: string; desc: string }[] = [
  { id: 'updown', name: '지표 업다운', time: '1분', desc: '다음 선수의 지표가 더 높을지 낮을지 맞혀 연속 기록에 도전해요.' },
  { id: 'blind', name: '블라인드 스탯 퀴즈', time: '하루 1문제', desc: '이름을 가린 지표 카드만 보고 어떤 선수인지 맞혀요.' },
  { id: 'challenge', name: '세이버 픽 챌린지', time: '주간 이벤트', desc: '지표 맞대결 5문제를 예측하고, 일주일 기록으로 채점받아요.' },
  { id: 'batted-ball', name: '이 타구, 안타일까?', time: '10구', desc: '타구 속도·발사각에 타자의 발과 상대 수비까지 보고 안타인지 맞혀요.' },
]

/** 게임을 열 수 있는지. 열 수 없으면 이유, 열 수 있으면 null */
export function gameBlockers(league: League, hasWeeklyData: boolean): Record<GameId, string | null> {
  const hitters = league.pool.H.length
  const starters = league.pitchers.filter((p) => p.raw.role === 'SP').length
  const teams = new Set(league.hitters.map((p) => p.team)).size
  return {
    updown: hitters >= 2 ? null : '비교할 타자가 부족해요.',
    blind: hitters >= 4 ? null : '보기를 만들 타자가 부족해요.',
    challenge: !hasWeeklyData
      ? '주간 기록을 제공하지 않는 데이터 출처예요.'
      : hitters >= 6 && starters >= 4 ? null : '문제를 낼 선수가 부족해요.',
    'batted-ball': !league.meta.available.battedBalls
      ? '트래킹 데이터를 확보한 경우에만 열려요.'
      : teams >= 2 && hitters >= 1 ? null : '선수가 부족해요.',
  }
}
