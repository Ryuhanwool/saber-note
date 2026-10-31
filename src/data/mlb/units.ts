// 서번트는 미국 단위와 0~100 백분율을 쓴다. 앱은 km/h, m/s, 0~1 비율로 통일한다.

export const KMH_PER_MPH = 1.609344
export const MPS_PER_FTPS = 0.3048

const map = (v: number | null, f: (x: number) => number) => (v === null ? null : f(v))

/** mph → km/h */
export const mphToKmh = (mph: number | null) => map(mph, (x) => x * KMH_PER_MPH)
/** ft/s → m/s */
export const ftpsToMps = (ftps: number | null) => map(ftps, (x) => x * MPS_PER_FTPS)
/** 0~100 백분율 → 0~1 비율 */
export const percentToRate = (pct: number | null) => map(pct, (x) => x / 100)
