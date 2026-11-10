// 한국 시간(UTC+9, 서머타임 없음) 기준 날짜·주차

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 한국 날짜 "YYYY-MM-DD" — 블라인드 퀴즈 "오늘의 문제" 열쇠 */
export function dayKeyKST(now: Date): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/** 한국 시간 기준 ISO 주차 "YYYY-Www" (월요일 시작) — 세이버 픽 챌린지 주차 */
export function weekIdKST(now: Date): string {
  const k = new Date(now.getTime() + KST_OFFSET_MS)
  const d = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()))
  const dayFromMonday = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayFromMonday + 3) // 그 주의 목요일
  const year = d.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(year, 0, 4))
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3)
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return `${year}-W${String(week).padStart(2, '0')}`
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 한국 날짜 "YYYY-MM-DD"에서 n일 뒤 */
export function shiftDayKey(dayKey: string, n: number): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + n * DAY_MS).toISOString().slice(0, 10)
}

/** "2026-11-10" → "2026.11.10" */
export const formatDayKey = (dayKey: string) => dayKey.replaceAll('-', '.')
