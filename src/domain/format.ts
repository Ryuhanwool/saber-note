import { metricDef, type MetricKey } from './catalog'
import { isMissing } from './missing'

/** 지표 값을 화면 표시 문자열로. 값 없음은 '-' */
export function formatMetric(key: MetricKey, v: unknown): string {
  if (isMissing(v)) return '-'
  const m = metricDef(key)
  const n = v as number
  if (m.kind === 'pct') return (n * 100).toFixed(m.digits) + '%'
  if (m.kind === 'rate') {
    const s = n.toFixed(m.digits)
    return n < 1 ? s.replace(/^0/, '') : s // 0.345 → .345
  }
  let s = m.grouped ? Math.round(n).toLocaleString('ko-KR') : n.toFixed(m.digits)
  if (m.signed && n > 0) s = '+' + s
  return s + (m.unit ?? '')
}

/** 아웃 수 → "123⅓이닝" */
export function formatInnings(outs: number): string {
  return Math.floor(outs / 3) + ['', '⅓', '⅔'][outs % 3] + '이닝'
}
