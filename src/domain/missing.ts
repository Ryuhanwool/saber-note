// 값 없음 규칙: null, undefined, NaN은 모두 "값 없음"이다.
// 리그 평균·백분위·비교 판정은 값 없음을 건너뛰고, 분모에도 넣지 않는다.

export const isMissing = (v: unknown): boolean => v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))

/** 값이 있는 숫자만 원래 순서대로 */
export const presentNumbers = (values: readonly unknown[]): number[] =>
  values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
