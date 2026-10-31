import { useState } from 'react'
import { availableKeys } from '../../domain/availability'
import { metricDef } from '../../domain/catalog'
import { formatMetric } from '../../domain/format'
import { answerUpDown, nextUpDown, startUpDown, UPDOWN_KEYS } from '../../domain/games/updown'
import { metricValue } from '../../domain/percentile'
import { useLeague } from '../shared/LeagueContext'
import { localStore } from './storage'

const BEST_KEY = 'saber-ud-best'

/** 게임 1. 지표 업다운 */
export default function UpDownGame() {
  const league = useLeague()
  const pool = league.pool.H
  const keys = availableKeys(league, UPDOWN_KEYS)
  const [s, setS] = useState(() => startUpDown(pool, keys, Math.random)!)
  const [best, setBest] = useState(() => Number(localStore.get(BEST_KEY) ?? 0))
  const [explain, setExplain] = useState(false)
  const m = metricDef(s.key)
  const va = metricValue(s.a, s.key)
  const vb = metricValue(s.b, s.key)

  function answer(guess: 'higher' | 'lower') {
    const next = answerUpDown(s, guess)
    if (next.streak > best) {
      setBest(next.streak)
      localStore.set(BEST_KEY, String(next.streak))
    }
    setS(next)
  }

  const compare = va === null || vb === null ? '비교할 수 없어요' : vb > va ? '높아요' : vb < va ? '낮아요' : '같아요'

  return (
    <div className="panel">
      <div className="ph">
        <h1 className="display" style={{ fontSize: '2rem' }}>지표 업다운</h1>
        <div className="muted">연속 <b>{s.streak}</b> · 최고 {best}</div>
      </div>
      <p style={{ margin: 0 }}>
        오른쪽 선수의{' '}
        <button className="mname" style={{ display: 'inline-flex' }} aria-expanded={explain} onClick={() => setExplain(!explain)}>
          <b>{m.label}</b><span className="i" aria-hidden="true">i</span>
        </button>
        는 왼쪽 선수보다 높을까요, 낮을까요?
      </p>
      {explain && (
        <div className="explain" style={{ marginTop: 10 }}>
          <p>{m.desc}</p>
          <p className="muted">기준: {m.scale}</p>
        </div>
      )}
      <div className="duel">
        <div className="pcard"><div className="display">{s.a.name}</div><div className="muted">{s.a.team}</div><div className="big">{formatMetric(s.key, va)}</div></div>
        <div className="vs display" style={{ alignSelf: 'center' }}>VS</div>
        <div className="pcard"><div className="display">{s.b.name}</div><div className="muted">{s.b.team}</div><div className="big">{s.result ? formatMetric(s.key, vb) : '?'}</div></div>
      </div>
      {s.result ? (
        <>
          <div className="result" role="status">
            {s.result === 'ok' ? <span className="ok">정답!</span> : <span className="no">아쉬워요.</span>}{' '}
            {s.b.name}의 {m.label}는 {formatMetric(s.key, vb)}로, {s.a.name}({formatMetric(s.key, va)})보다 {compare}.
          </div>
          <div className="choice">
            {s.over ? (
              <button className="btn" onClick={() => setS(startUpDown(pool, keys, Math.random)!)}>다시 시작</button>
            ) : (
              <button className="btn" onClick={() => setS(nextUpDown(s, pool, keys, Math.random))}>다음 선수</button>
            )}
          </div>
        </>
      ) : (
        <div className="choice">
          <button className="btn" onClick={() => answer('higher')}>더 높다</button>
          <button className="btn ghost" onClick={() => answer('lower')}>더 낮다</button>
        </div>
      )}
    </div>
  )
}
