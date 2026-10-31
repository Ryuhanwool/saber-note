import { useState } from 'react'
import { metricAvailable } from '../../domain/availability'
import type { MetricKey } from '../../domain/catalog'
import { formatMetric } from '../../domain/format'
import { BALLS_PER_ROUND, makePlay, type BattedBallPlay } from '../../domain/games/battedBall'
import { metricValue, percentile, topPercent } from '../../domain/percentile'
import type { HitterPlayer } from '../../domain/players'
import { useLeague } from '../shared/LeagueContext'
import { positionLabel } from '../shared/labels'

const DIR_LABEL = { L: '좌측', C: '가운데', R: '우측' } as const
/** 위에서 본 그림의 수비 위치 */
const FPOS = { C: [100, 166], '1B': [140, 117], '2B': [121, 99], SS: [80, 99], '3B': [60, 117], LF: [46, 55], CF: [100, 30], RF: [154, 55] } as const
const POS_LABEL = { C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', LF: '좌익수', CF: '중견수', RF: '우익수' } as const

/** 보정값 표시: +.012 / −.008 (반올림해서 0이면 부호 없이 .000) */
function delta(v: number): string {
  const s = Math.abs(v).toFixed(3).replace(/^0/, '')
  if (Number(s) === 0) return s
  return (v >= 0 ? '+' : '−') + s
}

function why(b: BattedBallPlay): string {
  const f = b.fielder
  switch (b.reason) {
    case 'home-run': return '담장을 넘어가는 타구라 수비와 주루는 상관없었어요.'
    case 'popup': return '높이 뜬 내야 뜬공은 거의 항상 잡혀요. 발도 수비도 큰 차이를 만들지 못해요.'
    case 'neutral': return '타자의 발과 상대 수비 모두 평균 수준이라 타구 자체가 결과를 정했어요.'
    case 'speed-up': return `${b.batter.name}의 빠른 발이 안타 확률을 끌어올렸어요.`
    case 'speed-down': return `${b.batter.name}의 느린 발 때문에 안타 확률이 내려갔어요.`
    case 'defense-good': return `${POS_LABEL[b.fielderPos]} ${f?.name}의 넓은 수비 범위가 안타 확률을 깎았어요.`
    case 'defense-bad': return `${POS_LABEL[b.fielderPos]} ${f?.name}의 수비 범위가 좁아 안타 확률이 올라갔어요.`
  }
}

function KV({ player, k, label }: { player: HitterPlayer; k: MetricKey; label: string }) {
  const league = useLeague()
  if (!metricAvailable(league, k)) return null
  const pc = percentile(league, player, k)
  return (
    <div className="kv">
      <span>{label}</span>
      <b>{formatMetric(k, metricValue(player, k))}</b>
      {pc !== null && <small>상위 {topPercent(pc)}%</small>}
    </div>
  )
}

/** 게임 4. 이 타구, 안타일까? */
export default function BattedBallGame() {
  const league = useLeague()
  const batters = league.pool.H
  const newPlay = () => makePlay(league, batters, Math.random)!
  const [round, setRound] = useState(() => ({ i: 1, score: 0, flips: 0, play: newPlay(), answer: null as boolean | null }))
  const { i, score, flips, play: b, answer } = round
  const done = i > BALLS_PER_ROUND

  // 옆에서 본 궤적
  const rad = (b.la * Math.PI) / 180
  const len = 40 + ((b.ev - 95) / 90) * 120
  const x2 = 30 + Math.cos(rad) * len
  const y2 = 150 - Math.sin(rad) * len
  // 위에서 본 방향
  const far = b.la < 10 ? 45 + ((b.ev - 95) / 90) * 30 : b.la > 50 ? 40 : 70 + ((b.ev - 95) / 90) * 75
  const bx = 100 + Math.sin((b.deg * Math.PI) / 180) * far
  const by = 155 - Math.cos((b.deg * Math.PI) / 180) * far
  const [fx, fy] = FPOS[b.fielderPos]
  const kind = b.la < 10 ? '땅볼' : b.la > 50 ? '내야 뜬공' : b.la > 25 ? '뜬공' : '라인드라이브'
  const range = b.fielder && league.meta.available.fielding.ratings ? b.fielder.raw.fielding.ratings?.find((r) => r.label === '수비 범위')?.grade : undefined
  const noAdj = b.homeRunZone || b.popup

  function choose(hit: boolean) {
    setRound({ ...round, answer: hit, score: score + (hit === b.hit ? 1 : 0), flips: flips + (b.flipped ? 1 : 0) })
  }

  return (
    <div className="panel">
      <div className="ph">
        <h1 className="display" style={{ fontSize: '2rem' }}>이 타구, 안타일까?</h1>
        <div className="muted">{done ? '완료' : `${i} / ${BALLS_PER_ROUND}구`} · 맞힌 수 <b>{score}</b></div>
      </div>
      {done ? (
        <>
          <div className="result" role="status">
            <b>{BALLS_PER_ROUND}구 중 {score}개를 맞혔어요.</b>{' '}
            {flips ? `그중 ${flips}구는 타자의 발이나 상대 수비 때문에 안타 확률이 50%를 사이에 두고 뒤집혔어요.` : '이번에는 발이나 수비 때문에 결과가 뒤집힌 타구는 없었어요.'}{' '}
            같은 타구라도 땅볼은 타자의 발이, 라인드라이브와 뜬공은 수비수의 범위가 결과를 바꿔요. 이 보정까지 합친 것이 실제 서비스의 기대 타율 분석이에요.
          </div>
          <div className="choice">
            <button className="btn" onClick={() => setRound({ i: 1, score: 0, flips: 0, play: newPlay(), answer: null })}>다시 하기</button>
          </div>
        </>
      ) : (
        <>
          <p className="muted" style={{ margin: '0 0 12px' }}>땅볼은 타자의 발이, 라인드라이브와 뜬공은 수비수의 범위가 중요해요. 담장을 넘는 타구는 둘 다 상관없어요.</p>
          <div className="bbwho">
            <div className="who">
              <span className="muted">타자</span>
              <b className="display">{b.batter.name}</b>
              <span className="muted">{b.batter.team}</span>
              <KV player={b.batter} k="sprint" label="스프린트 스피드" />
              <KV player={b.batter} k="h2f" label="홈→1루 시간" />
              <KV player={b.batter} k="xbt" label="추가 진루율" />
            </div>
            <div className="who">
              <span className="muted">타구 방향의 수비수</span>
              {b.fielder ? (
                <>
                  <b className="display">{b.fielder.name}</b>
                  <span className="muted">{b.team} {positionLabel(b.fielder)} · 이 포지션 수비 이닝 최다</span>
                  <KV player={b.fielder} k="oaa" label="OAA" />
                  <KV player={b.fielder} k="drs" label="DRS" />
                  {range !== undefined && <div className="kv"><span>수비 범위 능력치</span><b>{range}</b><small>20~80, 평균 50</small></div>}
                </>
              ) : (
                <>
                  <b className="display">{POS_LABEL[b.fielderPos]}</b>
                  <span className="muted">{b.team} · 수비 기록이 있는 선수가 없어 수비 보정을 하지 않아요</span>
                </>
              )}
            </div>
          </div>
          <div className="row" style={{ alignItems: 'center', marginTop: 12 }}>
            <svg viewBox="0 0 220 170" width="230" role="img" aria-label={`옆에서 본 타구 궤적: 발사각 ${b.la.toFixed(0)}도`}>
              <line x1="10" x2="215" y1="150" y2="150" stroke="var(--line)" strokeWidth="2" />
              <line x1="30" y1="150" x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke="var(--seam)" strokeWidth="3" strokeLinecap="round" />
              <circle cx={x2.toFixed(1)} cy={y2.toFixed(1)} r="6" fill="var(--surface)" stroke="var(--seam)" strokeWidth="2" />
              <circle cx="30" cy="150" r="4" fill="var(--ink)" />
              <text x="110" y="166" textAnchor="middle" fontSize="10" fill="var(--soft)">옆에서 본 궤적</text>
            </svg>
            <svg viewBox="0 0 200 180" width="210" role="img" aria-label={`위에서 본 타구 방향: ${DIR_LABEL[b.dir]}, 수비수 ${POS_LABEL[b.fielderPos]}`}>
              <path d="M100 158 L12 70 Q100 -22 188 70 Z" fill="var(--field)" opacity=".12" />
              <path d="M100 158 L139 119 L100 80 L61 119 Z" fill="none" stroke="var(--line)" strokeWidth="1.5" />
              <line x1="100" y1="158" x2={bx.toFixed(1)} y2={by.toFixed(1)} stroke="var(--seam)" strokeWidth="2.5" strokeDasharray={b.la < 10 ? '0' : '5 3'} />
              <circle cx={bx.toFixed(1)} cy={by.toFixed(1)} r="4" fill="var(--seam)" />
              <circle cx={fx} cy={fy} r="8" fill="var(--ink)" />
              <text x={fx} y={fy + 3} textAnchor="middle" fontSize="8" fill="var(--paper)" fontWeight="700">{b.fielderPos}</text>
              <text x="100" y="176" textAnchor="middle" fontSize="10" fill="var(--soft)">위에서 본 방향 ({kind})</text>
            </svg>
            <div className="statgrid" style={{ flex: 1, minWidth: 200 }}>
              <div className="stat"><b>{b.ev.toFixed(0)} km/h</b><span>타구 속도</span></div>
              <div className="stat"><b>{b.la.toFixed(0)}°</b><span>발사각</span></div>
              <div className="stat"><b>{DIR_LABEL[b.dir]}</b><span>방향</span></div>
            </div>
          </div>
          {answer === null ? (
            <div className="choice">
              <button className="btn" onClick={() => choose(true)}>안타</button>
              <button className="btn ghost" onClick={() => choose(false)}>아웃</button>
            </div>
          ) : (
            <>
              <div className="result" role="status">
                {answer === b.hit ? <span className="ok">정답!</span> : <span className="no">아쉬워요.</span>} 결과는 <b>{b.hit ? b.type : '아웃'}</b>
                {b.extraBase && ' (빠른 발로 한 베이스 더!)'}. {why(b)}
                <table className="brk">
                  <tbody>
                    <tr><th scope="row">기본 기대 타율 <small>타구 속도·발사각</small></th><td>{formatMetric('xba', b.base)}</td></tr>
                    <tr>
                      <th scope="row">타자 주루 보정 <small>{b.batter.name}{metricAvailable(league, 'sprint') && `, 스프린트 ${formatMetric('sprint', b.batter.m.sprint)}`}</small></th>
                      <td>{noAdj ? '해당 없음' : delta(b.speedAdj)}</td>
                    </tr>
                    <tr>
                      <th scope="row">상대 수비 보정 <small>{b.fielder ? `${POS_LABEL[b.fielderPos]} ${b.fielder.name}, OAA ${formatMetric('oaa', b.fielder.m.oaa)}` : '수비수 정보 없음'}</small></th>
                      <td>{noAdj ? '해당 없음' : delta(b.defenseAdj)}</td>
                    </tr>
                    <tr className="tot"><th scope="row">최종 안타 확률</th><td>{formatMetric('xba', b.p)}</td></tr>
                  </tbody>
                </table>
                <div className="muted" style={{ fontSize: '.85rem' }}>같은 상황이 10번 나오면 약 {Math.round(b.p * 10)}번 안타가 돼요.</div>
              </div>
              <div className="choice">
                <button className="btn" onClick={() => setRound({ ...round, i: i + 1, play: newPlay(), answer: null })}>
                  {i === BALLS_PER_ROUND ? '결과 보기' : '다음 타구'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
