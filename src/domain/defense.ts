import type { FieldPosition } from '../data/types'
import type { MetricKey } from './catalog'
import { formatMetric } from './format'
import type { HitterPlayer, League } from './players'

export const isInfield = (pos: FieldPosition) => pos === '1B' || pos === '2B' || pos === '3B' || pos === 'SS'
export const isOutfield = (pos: FieldPosition) => pos === 'LF' || pos === 'CF' || pos === 'RF'

/** 종합 수비 지표 */
export const OVERALL_DEFENSE: MetricKey[] = ['drs', 'uzr', 'oaa', 'zr']

/** UZR 세부 구성 (포수는 프레이밍·블로킹·도루 저지) */
export const defenseParts = (pos: FieldPosition): MetricKey[] =>
  pos === 'C' ? ['frmR', 'blkR', 'csR', 'csp', 'errR'] : ['rngR', 'errR', 'dpR', 'armR']

/** 전통 기록 칸 (출처가 주는 기록만). 값이 없으면 '-' */
export function traditionalFielding(league: League, p: HitterPlayer): { label: string; value: string }[] {
  const a = league.meta.available.fielding
  const f = p.raw.fielding
  const m = p.m
  const n = (v: number | null, digits = 0) =>
    v === null ? '-' : digits ? v.toFixed(digits) : Math.round(v).toLocaleString('ko-KR')
  const items: { label: string; value: string; ok: boolean }[] = [
    { label: '수비 이닝', value: n(m.inn), ok: a.inn },
    { label: '수비율', value: formatMetric('fpct', m.fpct), ok: a.TC && a.E },
    { label: '실책', value: n(f.E), ok: a.E },
    { label: '레인지 팩터', value: n(m.rf9, 2), ok: a.TC && a.E && a.inn },
  ]
  const pos = p.raw.pos
  if (pos === 'C') items.push({ label: '도루 저지율', value: formatMetric('csp', m.csp), ok: a.csp })
  else if (isInfield(pos)) items.push({ label: '병살 처리', value: n(f.DP), ok: a.DP })
  else if (isOutfield(pos)) items.push({ label: '보살', value: n(f.A_OF), ok: a.A_OF })
  return items.filter((x) => x.ok).map(({ label, value }) => ({ label, value }))
}

/** 20~80 스카우팅 등급을 말로 (50이 평균) */
export function ratingWord(grade: number): string {
  if (grade >= 80) return '최고 수준'
  if (grade >= 70) return '매우 뛰어남'
  if (grade >= 60) return '뛰어남'
  if (grade >= 55) return '평균 이상'
  if (grade >= 50) return '평균'
  if (grade >= 45) return '평균 이하'
  if (grade >= 40) return '약점'
  return '큰 약점'
}

/** 수비 탭에 보여 줄 것이 하나라도 있는지 (탭 열기 판단): 수비 기록을 하나라도 주면 연다 */
export const defenseTabAvailable = (league: League) => Object.values(league.meta.available.fielding).some(Boolean)
