import { useMemo, useState } from 'react'
import { metricDef, type MetricKey } from '../../domain/catalog'
import { formatInnings, formatMetric } from '../../domain/format'
import type { Player } from '../../domain/players'
import {
  CLUTCH_ADJUST_RANGE, adjustedValue, clampClutch, initialClutch, isOriginal, limitsOf, setStat, statsOf,
  type HitterAdjustKey, type HitterStats, type PitcherAdjustKey, type PitcherStats,
} from '../../domain/value/adjust'
import { clutchScore, evidenceSummary, type ClutchResult } from '../../domain/value/clutch'
import { CLUTCH_POINTS_PER_WIN } from '../../domain/value/scoring'
import { formatWon, playerValue, valueFormula, type ValueBreakdown } from '../../domain/value/value'
import { useLeague } from '../shared/LeagueContext'
import './value.css'

type Stats = HitterStats | PitcherStats

const HITTER_ROWS: { key: HitterAdjustKey; label: string }[] = [
  { key: 'HR', label: '홈런' }, { key: 'H', label: '안타' }, { key: 'BB', label: '볼넷' }, { key: 'SO', label: '삼진' }, { key: 'SB', label: '도루' },
]
const PITCHER_ROWS: { key: PitcherAdjustKey; label: string }[] = [
  { key: 'outs', label: '이닝' }, { key: 'SO', label: '탈삼진' }, { key: 'BB', label: '볼넷' }, { key: 'HR', label: '피홈런' }, { key: 'ER', label: '자책점' },
]
const HITTER_RESULT: MetricKey[] = ['ops', 'wrcp', 'WAR']
const PITCHER_RESULT: MetricKey[] = ['era', 'fip', 'WAR']

/** 0.1 단위 수를 부호와 함께 ("+0.4", "−1.2", "0.0") */
const signed1 = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(1)
const signed2 = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(2)
const plain1 = (x: number) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(1)

/** 계산 과정: 기준 → WAR → 클러치 → (최저 금액) → 예상 가치 */
function Steps({ v }: { v: ValueBreakdown }) {
  return (
    <ol className="value-steps" aria-label="계산 과정">
      <li><span>기준</span><b>{formatWon(v.base)}</b></li>
      <li><span>+ WAR {plain1(v.war)} <small>(0.1당 1,000만 원)</small></span><b>{formatWon(v.warAmount)}</b></li>
      {v.clutch !== null && (
        <li>
          <span>+ 클러치 {plain1(v.clutch)} <small>{v.clutch <= 0 ? '(0 이하는 깎지 않음)' : '(0.1당 1,000만 원)'}</small></span>
          <b>{formatWon(v.clutchAmount)}</b>
        </li>
      )}
      {v.floorApplied && (
        <li><span>합계 {formatWon(v.sum)} → 최저 금액 적용</span><b>{formatWon(v.total)}</b></li>
      )}
      <li className="total"><span>= 예상 가치</span><b>{formatWon(v.total)}</b></li>
    </ol>
  )
}

function ClutchEvidence({ c }: { c: ClutchResult }) {
  const shown = c.evidence.filter((e) => e.count > 0)
  return (
    <section className="value-sec" aria-labelledby="clutch-h">
      <h2 id="clutch-h">클러치 근거</h2>
      <p className="value-lead">{evidenceSummary(c)}</p>
      {shown.length > 0 && (
        <table className="value-table">
          <thead><tr><th scope="col">점수가 된 기록</th><th scope="col">횟수</th><th scope="col">7회 이후</th><th scope="col">점수</th></tr></thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.key}><th scope="row">{e.label}</th><td>{e.count}회</td><td>{e.late}회</td><td>{e.points.toFixed(1)}점</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted value-note">
        받은 점수 {c.points.toFixed(1)}점 − 같은 기회를 받은 리그 평균 선수의 기대 점수 {c.expected.toFixed(1)}점 = 클러치 점수 {signed1(c.score)}점
        → {CLUTCH_POINTS_PER_WIN}점을 1승으로 바꿔 {signed2(c.wins)}승.
        경기당 클러치 {signed2(c.perGame)}점 ({c.games}경기).
        {c.lostGoAheadOrTying > 0 && ` 팀이 진 경기의 역전타·동점타 ${c.lostGoAheadOrTying}회는 점수에 넣지 않았어요.`}
        {' '}7회 이후 1.5배, 연장 2배.
      </p>
    </section>
  )
}

function Stepper(props: {
  label: string; value: number; original: number; min: number; max: number; step: number
  show: (v: number) => string; onChange: (v: number) => void
}) {
  const { label, value, original, min, max, step, show, onChange } = props
  const changed = value !== original
  return (
    <div className={`adj-row${changed ? ' changed' : ''}`}>
      <span className="adj-name">{label}</span>
      <span className="adj-orig">원래 {show(original)}</span>
      <div className="adj-ctrl">
        <button type="button" className="adj-btn" aria-label={`${label} 줄이기`} disabled={value <= min} onClick={() => onChange(value - step)}>−</button>
        <output className="adj-val" aria-live="polite">{show(value)}</output>
        <button type="button" className="adj-btn" aria-label={`${label} 늘리기`} disabled={value >= max} onClick={() => onChange(value + step)}>+</button>
      </div>
      <input
        type="range" className="adj-range" aria-label={label}
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {changed && <span className="adj-flag">바뀜</span>}
    </div>
  )
}

/** 선수 카드 「선수 가치」 탭 */
export default function ValueTab({ player: p }: { player: Player }) {
  const league = useLeague()
  const original = useMemo(() => playerValue(league, p), [league, p])
  const clutch = useMemo(() => clutchScore(league, p), [league, p])
  const origStats = useMemo(() => statsOf(p), [p])
  const origClutch = useMemo(() => initialClutch(league, p), [league, p])
  const [stats, setStats] = useState<Stats>(origStats)
  const [clutchWins, setClutchWins] = useState<number | null>(origClutch)

  const adjusted = useMemo(() => adjustedValue(league, p, stats, clutchWins), [league, p, stats, clutchWins])
  const touched = !isOriginal(p, stats) || clutchWins !== origClutch
  const v = adjusted.value
  const diff = v.total - original.total
  const limits = limitsOf(p, stats)
  const rows = p.type === 'H' ? HITTER_ROWS : PITCHER_ROWS
  const resultKeys = p.type === 'H' ? HITTER_RESULT : PITCHER_RESULT
  const metric = (pl: Player, k: MetricKey) => (pl.m as Record<string, unknown>)[k]

  return (
    <div className="value">
      <div className="value-head">
        <span className="value-label">{touched ? '바꾼 기록의 예상 가치' : '예상 가치'}</span>
        <strong className="value-amount display">{formatWon(v.total)}</strong>
        <p className="value-disclaimer">실제 연봉과 무관합니다.</p>
        {touched && (
          <p className="value-vs">
            원래 {formatWon(original.total)} → 바꾼 기록 {formatWon(v.total)}
            {' '}({diff === 0 ? '변화 없음' : `${diff > 0 ? '+' : ''}${formatWon(diff)}`})
          </p>
        )}
        <p className="muted value-sub">WAR와 결정적인 순간의 활약(클러치)으로 계산한 재미용 금액이에요.</p>
      </div>

      <section className="value-sec" aria-labelledby="calc-h">
        <h2 id="calc-h">계산 과정</h2>
        <p className="value-formula">{valueFormula(v)}</p>
        <Steps v={v} />
      </section>

      {clutch && <ClutchEvidence c={clutch} />}

      <section className="value-sec" aria-labelledby="adj-h">
        <div className="adj-head">
          <h2 id="adj-h">스탯 조절</h2>
          <button
            type="button" className="btn ghost" disabled={!touched}
            onClick={() => { setStats(origStats); setClutchWins(origClutch) }}
          >
            원래 기록으로
          </button>
        </div>
        <p className="muted value-note">
          기록을 바꾸면 같은 공식으로 지표를 다시 계산해 WAR로만 가치에 반영해요(같은 활약을 두 번 세지 않게).
          {p.type === 'P' && ' 이 앱의 투수 WAR는 FIP 기준이라 자책점을 바꾸면 ERA만 바뀌고 가치는 그대로예요.'}
        </p>
        <div className="adj-list">
          {rows.map(({ key, label }) => (
            <Stepper
              key={key} label={label}
              value={(stats as Record<string, number>)[key]}
              original={(origStats as Record<string, number>)[key]}
              min={limits[key].min} max={limits[key].max} step={1}
              show={key === 'outs' ? formatInnings : (n) => `${n}개`}
              onChange={(n) => setStats((s) => setStat(p, s, key, n))}
            />
          ))}
          {clutchWins !== null && origClutch !== null && (
            <Stepper
              label="클러치 점수(승)" value={clutchWins} original={origClutch}
              min={CLUTCH_ADJUST_RANGE.min} max={CLUTCH_ADJUST_RANGE.max} step={0.1}
              show={signed1}
              onChange={(n) => setClutchWins(clampClutch(n))}
            />
          )}
        </div>
        <table className="value-table result" aria-label="다시 계산한 지표">
          <thead><tr><th scope="col">지표</th><th scope="col">원래</th><th scope="col">바꾼 기록</th></tr></thead>
          <tbody>
            {resultKeys.map((k) => {
              const a = formatMetric(k, metric(p, k)), b = formatMetric(k, metric(adjusted.player, k))
              return (
                <tr key={k} className={a !== b ? 'changed' : ''}>
                  <th scope="row">{metricDef(k).label}</th><td>{a}</td><td>{b}{a !== b && <span className="sr-only"> (바뀜)</span>}</td>
                </tr>
              )
            })}
            <tr className={diff !== 0 ? 'changed' : ''}>
              <th scope="row">예상 가치</th><td>{formatWon(original.total)}</td><td>{formatWon(v.total)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  )
}
