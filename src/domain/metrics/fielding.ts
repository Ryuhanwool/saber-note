import type { RawFielding } from '../../data/types'
import { isMissing } from '../missing'

const UZR_PARTS = ['rngR', 'errR', 'dpR', 'armR', 'frmR', 'blkR', 'csR'] as const

/** UZR = 구성 요소(범위·실책·병살·송구·프레이밍·블로킹·도루 저지 득점) 합계. 구성 요소가 하나도 없으면 null */
export function uzr(f: RawFielding): number | null {
  if (UZR_PARTS.every((k) => isMissing(f[k]))) return null
  // 데모와 같은 덧셈 순서를 지킨다 (부동소수점 결과가 같도록)
  return UZR_PARTS.reduce((a, k) => a + (f[k] ?? 0), 0)
}

export function fieldingStats(f: RawFielding) {
  const hasChances = !isMissing(f.TC) && !isMissing(f.E) && f.TC! > 0
  return {
    inn: f.inn,
    uzr: uzr(f),
    drs: f.drs, oaa: f.oaa, zr: f.zr,
    rngR: f.rngR, errR: f.errR, dpR: f.dpR, armR: f.armR, frmR: f.frmR, blkR: f.blkR, csR: f.csR, csp: f.csp,
    /** 수비율 = (수비 기회 - 실책) / 수비 기회 */
    fpct: hasChances ? (f.TC! - f.E!) / f.TC! : null,
    /** 레인지 팩터 = 9이닝당 실책 없이 처리한 수비 기회 */
    rf9: hasChances && !isMissing(f.inn) && f.inn! > 0 ? ((f.TC! - f.E!) * 9) / f.inn! : null,
  }
}
