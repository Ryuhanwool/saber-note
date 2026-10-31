import type { RawFielding } from './types'

/** 수비 기록이 하나도 없는 선수(지명타자 등)의 수비 기록: 모든 항목이 null */
export function emptyFielding(): RawFielding {
  return {
    inn: null, TC: null, E: null, DP: null, A_OF: null,
    rngR: null, errR: null, dpR: null, armR: null, frmR: null, blkR: null, csR: null, csp: null,
    drs: null, oaa: null, zr: null, ratings: null,
  }
}
