import { useSearchParams } from 'react-router'
import { formatDayKey } from '../../domain/games/calendar'
import { LINEUP_SLOTS, type LineupSlot } from '../../domain/lineup/slots'
import DemoReset from '../community/DemoReset'
import { useLeagueDay } from '../shared/LeagueContext'
import MyLineup from './MyLineup'
import PickRanking from './PickRanking'
import './lineup.css'

const TABS = [
  { id: 'mine', label: '내 라인업' },
  { id: 'picks', label: '포지션별 픽 순위' },
] as const

/** 상단 메뉴 「라인업」: 나만의 라인업 (올스타 투표처럼 포지션마다 선수 고르기)과 포지션별 픽 순위. 탭·포지션은 주소에 남긴다 */
export default function LineupPage() {
  const day = useLeagueDay()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'picks' ? 'picks' : 'mine'
  const pos = (LINEUP_SLOTS as readonly string[]).includes(params.get('pos') ?? '') ? (params.get('pos') as LineupSlot) : 'C'
  const go = (next: { tab?: string; pos?: LineupSlot }) => {
    const q = new URLSearchParams(params)
    if (next.tab) q.set('tab', next.tab)
    if (next.pos) q.set('pos', next.pos)
    setParams(q, { replace: true })
  }
  return (
    <>
      <div className="panel lineup-page">
        <h1 className="display">나만의 라인업</h1>
        <p className="muted lineup-sub">
          올스타 투표처럼 포지션마다 선수를 골라 보세요. 자리를 누르면 그 포지션 선수 목록이 떠요.
          {day && ` 예상 가치·WAR·세이브·홀드는 ${formatDayKey(day.date)} 기준이에요.`}
        </p>
        <div className="tabs lineup-tabs" role="tablist" aria-label="라인업 보기">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => go({ tab: t.id })}>{t.label}</button>
          ))}
        </div>
        <div role="tabpanel" aria-label={tab === 'mine' ? '내 라인업' : '포지션별 픽 순위'}>
          {tab === 'mine' ? <MyLineup /> : <PickRanking slot={pos} onSlot={(s) => go({ pos: s })} />}
        </div>
      </div>
      <DemoReset />
    </>
  )
}
