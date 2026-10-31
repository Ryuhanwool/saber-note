import { metricDef, type MetricKey } from './catalog'
import { isMissing } from './missing'

/**
 * 자릿수에 맞춰 반올림한 문자열. 반올림한 결과가 0이면 부호 없는 0으로 만든다.
 * (-0.04 → "0.0". 데모는 "-0.0"으로 표시했다)
 */
function fixed(x: number, digits: number): { s: string; zero: boolean } {
  const s = x.toFixed(digits)
  return Number(s) === 0 ? { s: (0).toFixed(digits), zero: true } : { s, zero: false }
}

/** 지표 값을 화면 표시 문자열로. 값 없음은 '-' */
export function formatMetric(key: MetricKey, v: unknown): string {
  if (isMissing(v)) return '-'
  const m = metricDef(key)
  const n = v as number
  if (m.kind === 'pct') return fixed(n * 100, m.digits).s + '%'
  if (m.kind === 'rate') {
    const { s } = fixed(n, m.digits)
    return n < 1 ? s.replace(/^0/, '') : s // 0.345 → .345
  }
  let s: string, zero: boolean
  if (m.grouped) {
    const r = Math.round(n)
    zero = r === 0
    s = (zero ? 0 : r).toLocaleString('ko-KR')
  } else {
    ;({ s, zero } = fixed(n, m.digits))
  }
  // 반올림해서 0이면 + 를 붙이지 않는다 (데모는 0.04를 "+0.0"으로 표시했다)
  if (m.signed && n > 0 && !zero) s = '+' + s
  return s + (m.unit ?? '')
}

/** 아웃 수 → "123⅓이닝" */
export function formatInnings(outs: number): string {
  return Math.floor(outs / 3) + ['', '⅓', '⅔'][outs % 3] + '이닝'
}
