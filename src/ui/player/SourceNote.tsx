import { useLeague } from '../shared/LeagueContext'

/** 수비·트래킹 탭 아래 "데이터 출처 · 반영일" (PRD 화면 5) */
export default function SourceNote() {
  const { meta } = useLeague()
  return (
    <p className="muted" style={{ fontSize: '.8rem', margin: '8px 0 0' }}>
      데이터 출처: {meta.source}
      {meta.asOf && ` · ${meta.asOf.replaceAll('-', '.')} 반영`}
    </p>
  )
}
