import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import type { PlayerId } from '../../data/types'
import { availableKeys } from '../../domain/availability'
import type { MetricKey } from '../../domain/catalog'
import { formatInnings } from '../../domain/format'
import type { Player } from '../../domain/players'
import { useLeague } from '../shared/LeagueContext'
import { comparePath, positionLabel } from '../shared/labels'
import MetricRow from '../shared/MetricRow'
import DefenseTab from './DefenseTab'
import { HITTER_TABS, PITCHER_TABS, tabAvailable } from './tabs'
import TrackingTab from './TrackingTab'
import './player.css'

function PlayerCard({ player: p }: { player: Player }) {
  const league = useLeague()
  const navigate = useNavigate()
  const { meta, constants } = league
  const tabs = p.type === 'H' ? HITTER_TABS : PITCHER_TABS
  const enabled = tabs.map((t) => tabAvailable(league, p, t))
  const [tab, setTab] = useState(() => Math.max(0, enabled.indexOf(true)))
  const [openKey, setOpenKey] = useState<MetricKey | null>(null)
  const current = tabs[tab]

  // 출처에 없는 지표 줄은 숨긴다 (값이 null인 줄은 "기록 없음"으로 보인다)
  const rows = (keys: MetricKey[]) =>
    availableKeys(league, keys).map((k) => (
      <MetricRow key={k} player={p} metricKey={k} open={openKey === k} onToggle={() => setOpenKey(openKey === k ? null : k)} />
    ))

  return (
    <>
      <button className="back" onClick={() => navigate('/')}>‹ 검색으로</button>
      <div className="panel">
        <div className="ph">
          <div>
            <h1 className="display">{p.name}</h1>
            <div className="meta">
              <span>{p.team}</span>
              <span>{positionLabel(p)}</span>
              <span>{p.raw.age}세</span>
              <span>{meta.seasonLabel}</span>
              <span>{p.type === 'H' ? `${p.raw.PA}타석` : formatInnings(p.raw.outs)}</span>
            </div>
            <span className="basis">
              계산 기준: {meta.basisLabel}
              {meta.asOf && ` · ${meta.asOf.replaceAll('-', '.')} 기록 반영`}
            </span>
          </div>
          <button className="btn ghost" onClick={() => navigate(comparePath(p.id))}>비교하기</button>
        </div>
        {p.type === 'H' && !p.qualified && (
          <p className="muted" style={{ margin: 0 }}>
            {constants.qualifiedPA}타석 미만이라 백분위는 참고용이에요. 막대는 {constants.qualifiedPA}타석 이상 타자들 사이의 위치입니다.
          </p>
        )}
        <div className="tabs" role="tablist">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={i === tab}
              disabled={!enabled[i]}
              title={enabled[i] ? undefined : `${meta.source}에는 이 기록이 없어요`}
              onClick={() => {
                setTab(i)
                setOpenKey(null)
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" aria-label={current.label}>
          {current.kind === 'metrics' && rows(current.keys)}
          {current.kind === 'defense' && p.type === 'H' && <DefenseTab player={p} rows={rows} />}
          {current.kind === 'tracking' && <TrackingTab player={p} rows={rows} />}
        </div>
      </div>
    </>
  )
}

/** 화면 2. 선수 지표 카드 */
export default function PlayerPage() {
  const league = useLeague()
  const navigate = useNavigate()
  const { id } = useParams()
  const player = id ? league.byId.get(id as PlayerId) : undefined

  if (!player) {
    return (
      <div className="panel">
        <p className="empty">선수를 찾을 수 없어요.</p>
        <button className="btn ghost" onClick={() => navigate('/')}>검색으로 돌아가기</button>
      </div>
    )
  }
  // 선수가 바뀌면 탭·열린 설명을 처음 상태로
  return <PlayerCard key={player.id} player={player} />
}
