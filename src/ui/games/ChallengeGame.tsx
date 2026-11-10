import { useState } from 'react'
import ChallengeDeadline from './ChallengeDeadline'
import { weekIdKST } from '../../domain/games/calendar'
import {
  challengePlayerIds, MIN_WEEKLY_PA, PERFECT_BONUS, POINTS_PER_QUESTION, scoreChallenge, startChallenge,
  type ChallengeQuestion, type ChallengeScore, type Side, type WeeklyLine,
} from '../../domain/games/challenge'
import { formatInnings, formatMetric } from '../../domain/format'
import { seededRandom } from '../../domain/random'
import { useDataSource, useLeague } from '../shared/LeagueContext'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const desc = (q: ChallengeQuestion) => (q.kind === 'H' ? '이번 주 wRC+가 더 높을 타자는?' : '이번 주 FIP가 더 낮을 선발은?')
const seasonLine = (q: ChallengeQuestion, s: Side) =>
  q.kind === 'H' ? `시즌 wRC+ ${formatMetric('wrcp', q[s].m.wrcp)}` : `시즌 FIP ${formatMetric('fip', q[s].m.fip)}`
const weekLine = (w: WeeklyLine) =>
  w.kind === 'H'
    ? w.PA ? `wRC+ ${Math.round(w.value!)}, ${w.PA}타석` : '출전 없음'
    : w.GS ? `FIP ${w.value!.toFixed(2)}, ${formatInnings(w.outs)}` : '등판 없음'

// 데모 순위표용 가상 참가자 (실제 사용자가 아님)
const DEMO_PLAYERS = ['야구는구속', '출루가답', 'FIP신봉자', '외야석지킴이', '배럴헌터', '볼넷요정', '9회말2아웃']

/** 게임 3. 세이버 픽 챌린지 — 문제는 주차마다 정해져 모두 같은 문제를 푼다 */
export default function ChallengeGame() {
  const league = useLeague()
  const source = useDataSource()
  // 화면을 연 시각 기준으로 주차를 고정한다 (렌더링 도중 자정·월요일을 넘겨도 문제가 바뀌지 않게)
  const [openedAt] = useState(() => Date.now())
  const [weekOffset, setWeekOffset] = useState(0)
  const weekId = weekIdKST(new Date(openedAt + weekOffset * WEEK_MS))
  const starters = league.pitchers.filter((p) => p.raw.role === 'SP')
  const qs = startChallenge(league.pool.H, starters, seededRandom(`challenge:${weekId}`))!
  const [picks, setPicks] = useState<(Side | null)[]>(() => Array(qs.length).fill(null))
  const [phase, setPhase] = useState<'pick' | 'submitted' | 'scoring' | 'scored'>('pick')
  const [result, setResult] = useState<ChallengeScore | null>(null)
  const all = picks.every(Boolean)

  async function playWeek() {
    setPhase('scoring')
    const week = await source.loadWeek!(weekId, challengePlayerIds(qs))
    setResult(scoreChallenge(qs, picks, week, league))
    setPhase('scored')
  }

  function nextWeek() {
    setWeekOffset(weekOffset + 1)
    setPicks(Array(qs.length).fill(null))
    setResult(null)
    setPhase('pick')
  }

  const boardRand = seededRandom(`board:${weekId}`)
  const board = result
    ? [...DEMO_PLAYERS.map((name) => ({ name, score: Math.floor(boardRand() * 7) * 10, me: false })), { name: '나', score: result.score, me: true }]
        .sort((a, b) => b.score - a.score)
    : null

  return (
    <>
      <div className="banner">
        <div>
          <b>세이버 픽 챌린지</b> <span className="muted">{weekId} · </span>
          <span className="muted">
            {phase === 'pick' ? <ChallengeDeadline demoNote /> : phase === 'scored' ? '채점 완료' : '제출 완료. 일주일 경기를 기다리는 중'}
          </span>
        </div>
        {result && <b className="display" style={{ fontSize: '1.6rem' }}>{result.score}점</b>}
      </div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="panel" style={{ flex: '2 1 420px' }}>
          {qs.map((q, i) => {
            const r = result?.results[i]
            return (
              <div key={i} className="q">
                <b>{i + 1}. {desc(q)}</b>
                <div className="qpick">
                  {(['a', 'b'] as const).map((s) => (
                    <button key={s} aria-pressed={picks[i] === s} disabled={phase !== 'pick'} onClick={() => setPicks(picks.map((x, j) => (j === i ? s : x)))}>
                      {q[s].name}<br /><small className="muted">{q[s].team}, {seasonLine(q, s)}</small>
                    </button>
                  ))}
                </div>
                {r && (
                  <div className="result" style={{ fontSize: '.9rem' }}>
                    {!r.valid ? (
                      <><span className="ok">전원 정답 처리</span> 표본 부족({q.kind === 'H' ? `주간 ${MIN_WEEKLY_PA}타석 미만` : '주간 등판 없음'}) 규칙이 적용됐어요.</>
                    ) : r.correct ? (
                      <span className="ok">정답 +{POINTS_PER_QUESTION}점</span>
                    ) : (
                      <span className="no">오답</span>
                    )}
                    <div className="muted">근거: {q.a.name} {weekLine(r.a)} / {q.b.name} {weekLine(r.b)}</div>
                  </div>
                )}
              </div>
            )
          })}
          <div className="choice" style={{ justifyContent: 'flex-start' }}>
            {phase === 'pick' && (
              <>
                <button className="btn" disabled={!all} onClick={() => setPhase('submitted')}>제출하기</button>
                {!all && <span className="muted" style={{ alignSelf: 'center' }}>5문제를 모두 골라 주세요</span>}
              </>
            )}
            {phase === 'submitted' && <button className="btn" onClick={playWeek}>일주일 경기 진행하기 (시뮬레이션)</button>}
            {phase === 'scoring' && <span className="muted">채점하는 중이에요…</span>}
            {phase === 'scored' && <button className="btn ghost" onClick={nextWeek}>다음 주차 시작</button>}
          </div>
        </div>
        <div className="panel" style={{ flex: '1 1 240px' }}>
          <h2>점수 규칙</h2>
          <p className="muted" style={{ fontSize: '.9rem', margin: 0 }}>
            1문제당 {POINTS_PER_QUESTION}점, 5문제를 모두 맞히면 보너스 {PERFECT_BONUS}점. 타자가 주간 {MIN_WEEKLY_PA}타석 미만이거나 투수가 등판하지 않으면
            그 문제는 전원 정답 처리해요. 채점 기준: {league.meta.basisLabel}.
          </p>
          {board && (
            <>
              <h2 style={{ marginTop: 18 }}>이번 주 순위 <small className="muted">(가상 참가자, 데모)</small></h2>
              <ol className="board">
                {board.map((b, i) => (
                  <li key={b.name} className={b.me ? 'me' : ''}>
                    <span>{i + 1}</span>
                    <span>{b.name}{b.me && <span className="tag">나</span>}</span>
                    <span>{b.score}점</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </>
  )
}
