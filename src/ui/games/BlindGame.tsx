import { useState } from 'react'
import { availableKeys } from '../../domain/availability'
import { metricDef } from '../../domain/catalog'
import { formatMetric } from '../../domain/format'
import { BLIND_STATS, blindHintsShown, dailyBlind, guessBlind, startBlind } from '../../domain/games/blind'
import { dayKeyKST } from '../../domain/games/calendar'
import { metricValue, percentile, topPercent } from '../../domain/percentile'
import { useLeague } from '../shared/LeagueContext'
import { positionLabel } from '../shared/labels'
import { BLIND_DONE_KEY, localStore } from './storage'

/** 게임 2. 블라인드 스탯 퀴즈 — 처음에는 오늘의 문제(모두 같은 문제), 그다음은 연습 문제 */
export default function BlindGame() {
  const league = useLeague()
  const pool = league.pool.H
  // 화면을 연 날짜의 문제로 고정한다
  const [today] = useState(() => dayKeyKST(new Date()))
  const [q, setQ] = useState(() => dailyBlind(pool, today)!)
  const [daily, setDaily] = useState(true)
  const t = q.target
  const hints: [string, string][] = [['포지션', positionLabel(t)], ['팀', t.team], ['나이', `${t.raw.age}세`]]
  const shown = blindHintsShown(q, hints.length)
  const wrongCount = q.wrong.length
  const wrcPctl = percentile(league, t, 'wrcp')

  return (
    <div className="panel">
      <h1 className="display" style={{ fontSize: '2rem', margin: '0 0 6px' }}>블라인드 스탯 퀴즈</h1>
      <p className="muted" style={{ margin: '0 0 14px' }}>
        {daily ? `오늘의 문제 (${today}) · 오늘은 모두 같은 문제를 풀어요.` : '연습 문제'} 이 지표 카드의 주인공은 누구일까요? 틀릴 때마다 힌트가 하나씩 열려요.
      </p>
      <div className="statgrid">
        {availableKeys(league, BLIND_STATS).map((k) => (
          <div key={k} className="stat"><b>{formatMetric(k, metricValue(t, k))}</b><span>{metricDef(k).label}</span></div>
        ))}
      </div>
      <div className="hints">
        {hints.map(([label, value], i) => (
          <span key={label} className={i < shown ? 'chip' : 'chip muted'}>{label}: {i < shown ? value : '?'}</span>
        ))}
      </div>
      <div className="opts">
        {q.options.map((p) => {
          const wrong = q.wrong.includes(p.id)
          const state = q.done && p === t ? 'right' : wrong ? 'wrong' : ''
          return (
            <button key={p.id} className="opt" data-state={state} disabled={q.done || wrong} onClick={() => {
              const next = guessBlind(q, p.id)
              setQ(next)
              // 오늘의 문제를 끝내면(맞혔든 못 맞혔든) 기록해 둔다 (홈 「오늘의 소식」)
              if (daily && next.done) localStore.set(BLIND_DONE_KEY, today)
            }}>
              {p.name}
            </button>
          )
        })}
      </div>
      {q.done && (
        <>
          <div className="result" role="status">
            {q.won ? (
              <><span className="ok">정답!</span> {wrongCount === 0 ? '힌트 없이' : `힌트 ${wrongCount}개로`} 맞혔어요.</>
            ) : (
              <span className="no">정답은 {t.name}이었어요.</span>
            )}{' '}
            {t.team} {positionLabel(t)}, wRC+ {formatMetric('wrcp', t.m.wrcp)}
            {wrcPctl !== null && `로 리그 상위 ${topPercent(wrcPctl)}% 타자예요.`}
          </div>
          <div className="choice">
            <button className="btn" onClick={() => { setQ(startBlind(pool, Math.random)!); setDaily(false) }}>연습 문제 풀기</button>
          </div>
        </>
      )}
    </div>
  )
}
