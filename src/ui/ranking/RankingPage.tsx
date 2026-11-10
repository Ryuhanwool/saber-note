import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { formatDayKey, shiftDayKey } from '../../domain/games/calendar'
import type { Player } from '../../domain/players'
import {
  changeDirection, movers, rankChangeLabel, rankingTeams, valueChangeLabel, valueRanking,
  type RankFilter, type RankGroup, type RankRow,
} from '../../domain/value/ranking'
import { formatWon } from '../../domain/value/value'
import { useLeague, useLeagueDay } from '../shared/LeagueContext'
import { useYesterday } from './useYesterday'
import { playerPath, positionLabel } from '../shared/labels'
import './ranking.css'

const GROUPS: { id: RankGroup; label: string }[] = [
  { id: 'all', label: '전체' }, { id: 'H', label: '타자' }, { id: 'P', label: '투수' },
]

const playerHref = (p: Player) => `${playerPath(p.id)}?tab=value`

/** 화면 읽기 프로그램용 순위 변화 문장 */
function rankChangeText(r: RankRow): string {
  const d = changeDirection(r.rankChange)
  if (d === 'new') return '새로 진입'
  if (d === 'same') return '순위 변동 없음'
  return `${Math.abs(r.rankChange!)}계단 ${d === 'up' ? '상승' : '하락'}`
}

/** ▲3 / ▼2 / – / NEW. 색과 함께 기호·숫자로도 구분한다 */
function RankChange({ r }: { r: RankRow }) {
  const d = changeDirection(r.rankChange)
  return (
    <span className={`rk-chg ${d}`} aria-label={rankChangeText(r)} title={rankChangeText(r)}>
      {rankChangeLabel(r)}
    </span>
  )
}

function ValueChange({ won }: { won: number | null }) {
  const d = changeDirection(won)
  return <span className={`rk-chg ${d}`}>{d === 'new' ? '–' : valueChangeLabel(won)}</span>
}

function MoverCard({ r, kind }: { r: RankRow; kind: 'up' | 'down' }) {
  return (
    <li className={`rk-card ${kind}`}>
      <Link className="rk-card-name" to={playerHref(r.player)}>{r.player.name}</Link>
      <span className="rk-card-meta">{r.player.team} · {positionLabel(r.player)}</span>
      <b className="rk-card-value">{formatWon(r.value.total)}</b>
      <span className="rk-card-change">
        <ValueChange won={r.valueChange} />
        <span className="rk-card-rank">
          {r.prev!.rank}위 → {r.rank}위 <RankChange r={r} />
        </span>
      </span>
    </li>
  )
}

function Movers({ title, rows, kind, empty }: { title: string; rows: RankRow[]; kind: 'up' | 'down'; empty: string }) {
  return (
    <section className="rk-movers" aria-labelledby={`rk-${kind}`}>
      <h2 id={`rk-${kind}`}>
        <span className={`rk-chg ${kind}`} aria-hidden="true">{kind === 'up' ? '▲' : '▼'}</span> {title}
      </h2>
      {rows.length ? <ol className="rk-cards">{rows.map((r) => <MoverCard key={r.player.id} r={r} kind={kind} />)}</ol> : <p className="muted">{empty}</p>}
    </section>
  )
}

/** 상단 메뉴 「가치 순위」: 예상 가치 순위표 */
export default function RankingPage() {
  const league = useLeague()
  const day = useLeagueDay()
  const date = day?.date ?? null
  const yesterday = useYesterday(date)
  const [filter, setFilter] = useState<RankFilter>({ group: 'all', team: null })
  const teams = useMemo(() => rankingTeams(league), [league])
  const rows = useMemo(() => valueRanking(league, yesterday.league, filter), [league, yesterday.league, filter])
  const { up, down } = useMemo(() => movers(rows), [rows])
  const compare = date !== null // 날짜별 기록이 있으면 전일과 비교한다

  return (
    <div className="panel ranking">
      <h1 className="display">선수 가치 순위</h1>
      <div className="rk-basis">
        <span className="basis">
          {date ? `${formatDayKey(date)} 기준 · 매일 0시(한국 시간) 갱신` : `${league.meta.seasonLabel} 기준`}
        </span>
        {day && !day.isToday && (
          <strong className="rk-demo-flag">시연용 날짜예요 · 실제 오늘은 {formatDayKey(day.today)}</strong>
        )}
      </div>
      <p className="rk-disclaimer">실제 연봉과 무관합니다.</p>
      <p className="muted rk-sub">
        WAR와 클러치로 계산한 예상 가치(1억 + WAR × 1억 + 클러치 추가금, 최저 3,000만 원)의 순위예요.
        {compare && ' 기록은 그날까지 최근 144경기 합계이고, 전날 순위와 비교해요.'}
      </p>

      {day && (
        <fieldset className="rk-demo">
          <legend>시연용 날짜 이동</legend>
          <button type="button" className="btn ghost" disabled={day.pending} onClick={() => day.setDate(shiftDayKey(day.date, -1))}>‹ 이전 날</button>
          <button type="button" className="btn ghost" disabled={day.pending} onClick={() => day.setDate(shiftDayKey(day.date, 1))}>다음 날 ›</button>
          <button type="button" className="btn ghost" disabled={day.isToday} onClick={() => day.setDate(null)}>오늘로</button>
          {day.pending && <span className="muted" role="status">불러오는 중…</span>}
        </fieldset>
      )}

      <div className="rk-filters">
        <div className="rk-seg" role="group" aria-label="선수 구분">
          {GROUPS.map((g) => (
            <button key={g.id} type="button" aria-pressed={filter.group === g.id} onClick={() => setFilter((f) => ({ ...f, group: g.id }))}>{g.label}</button>
          ))}
        </div>
        <label className="rk-team">
          <span>팀</span>
          <select value={filter.team ?? ''} onChange={(e) => setFilter((f) => ({ ...f, team: e.target.value || null }))}>
            <option value="">모든 팀</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>

      {compare && yesterday.ready && (
        <div className="rk-movers-wrap">
          <Movers title="오늘의 급상승" rows={up} kind="up" empty="전날보다 가치가 오른 선수가 없어요." />
          <Movers title="오늘의 급하락" rows={down} kind="down" empty="전날보다 가치가 내린 선수가 없어요." />
        </div>
      )}

      {!yesterday.ready ? (
        <p className="empty">전날 기록을 불러오는 중이에요…</p>
      ) : (
        <div className="rk-table-wrap">
          <table className="rk-table">
            <caption className="sr-only">선수 가치 순위표 ({rows.length}명)</caption>
            <thead>
              <tr>
                <th scope="col">순위</th>
                {compare && <th scope="col">변화</th>}
                <th scope="col">선수</th>
                <th scope="col" className="rk-col-team">팀</th>
                <th scope="col" className="rk-col-pos">포지션</th>
                <th scope="col" className="num">예상 가치</th>
                {compare && <th scope="col" className="num">전일 대비</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.player.id}>
                  <td className="rk-rank">{r.rank}</td>
                  {compare && <td><RankChange r={r} /></td>}
                  <th scope="row" className="rk-name">
                    <Link to={playerHref(r.player)}>{r.player.name}</Link>
                    <span className="rk-name-meta">{r.player.team} · {positionLabel(r.player)}</span>
                  </th>
                  <td className="rk-col-team">{r.player.team}</td>
                  <td className="rk-col-pos">{positionLabel(r.player)}</td>
                  <td className="num rk-value">{formatWon(r.value.total)}</td>
                  {compare && <td className="num"><ValueChange won={r.valueChange} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted rk-legend">
        <span className="rk-chg up">▲</span> 오름(빨강) · <span className="rk-chg down">▼</span> 내림(파랑) · – 변동 없음 · NEW 새로 진입.
        선수 이름을 누르면 그 선수 카드의 「선수 가치」 탭으로 가요.
      </p>
    </div>
  )
}
