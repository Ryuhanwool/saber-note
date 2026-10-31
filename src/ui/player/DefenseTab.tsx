import type { ReactNode } from 'react'
import { availableKeys } from '../../domain/availability'
import { metricDef, type MetricKey } from '../../domain/catalog'
import { defenseParts, OVERALL_DEFENSE, ratingWord, traditionalFielding } from '../../domain/defense'
import { metricValue } from '../../domain/percentile'
import type { HitterPlayer } from '../../domain/players'
import { useLeague } from '../shared/LeagueContext'
import SourceNote from './SourceNote'

type Props = { player: HitterPlayer; rows: (keys: MetricKey[]) => ReactNode }

/** 수비 탭: 종합 수비 지표 · 세부 구성 · 전통 기록 · 스카우팅 능력치 (출처가 주는 것만) */
export default function DefenseTab({ player: p, rows }: Props) {
  const league = useLeague()
  if (p.raw.pos === 'DH') {
    return <p className="empty">지명타자는 수비에 나서지 않아 수비 지표가 없어요. 대신 WAR 계산에서 포지션 보정으로 감점돼요.</p>
  }

  // 출처에 없는 지표는 숨기고, 이 포지션에 해당하지 않는 지표(값 null)도 데모처럼 뺀다
  const shown = (keys: MetricKey[]) => availableKeys(league, keys).filter((k) => metricValue(p, k) !== null)
  const overall = shown(OVERALL_DEFENSE)
  const parts = shown(defenseParts(p.raw.pos))
  const trad = traditionalFielding(league, p)
  const ratings = league.meta.available.fielding.ratings ? p.raw.fielding.ratings : null
  const nothing = !overall.length && !parts.length && !trad.length && !ratings?.length

  return (
    <>
      {nothing && <p className="empty">이 선수는 제공되는 수비 기록이 없어요.</p>}
      {overall.length > 0 && (
        <>
          <h3 className="sub">종합 수비 지표<small>평균 수비수 대비 몇 점을 더 막았는지</small></h3>
          {rows(overall)}
        </>
      )}
      {parts.length > 0 && (
        <>
          <h3 className="sub">세부 구성<small>UZR을 이루는 점수</small></h3>
          {rows(parts)}
        </>
      )}
      {trad.length > 0 && (
        <>
          <h3 className="sub">전통 기록</h3>
          <div className="statgrid">
            {trad.map((t) => (
              <div key={t.label} className="stat"><b>{t.value}</b><span>{t.label}</span></div>
            ))}
          </div>
        </>
      )}
      {ratings && ratings.length > 0 && (
        <>
          <h3 className="sub">스카우팅 능력치<small>OOTP식 20~80 등급, 50이 평균</small></h3>
          {ratings.map(({ label, grade }) => (
            <div key={label} className="rt">
              <span>{label}</span>
              <b>{grade}</b>
              <div className="scale" role="img" aria-label={`${label} ${grade}점, ${ratingWord(grade)}`}>
                {Array.from({ length: 12 }, (_, i) => <i key={i} className={i < (grade - 20) / 5 ? 'on' : ''} />)}
              </div>
              <span className="w muted">{ratingWord(grade)}</span>
            </div>
          ))}
        </>
      )}
      <p className="muted" style={{ fontSize: '.85rem', margin: '12px 0 0' }}>
        {overall.length > 1 && `수비 지표는 같은 선수라도 계산 방식(${overall.map((k) => metricDef(k).label).join(', ')})에 따라 값이 달라요. `}
        {ratings && ratings.length > 0 && '능력치는 기록이 아니라 스카우트 관점의 등급이고, 빨간 점선이 리그 평균(50)이에요. 실서비스에서는 기록을 바탕으로 추정한 등급이 들어가요.'}
      </p>
      <SourceNote />
    </>
  )
}
