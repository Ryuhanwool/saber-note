// 세이버 픽 챌린지 일정 (한국 시간): 월요일 0시 문제 공개 → 화요일 18:30 제출 마감 → 일요일 경기 뒤 채점

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const KST_OFFSET_MS = 9 * HOUR_MS

/** 마감: 화요일 18:30 (한국 시간, 그 주 월요일 0시부터 1일 18시간 30분 뒤) */
export const CHALLENGE_DEADLINE_AFTER_MONDAY_MS = DAY_MS + 18 * HOUR_MS + 30 * 60 * 1000

export type ChallengeSchedule = {
  /** 이번 주 월요일 0시 (한국 시간)의 시각 */
  weekStart: number
  /** 이번 주 마감 시각 (화요일 18:30) */
  deadline: number
  /** 다음 주 문제 공개 (다음 월요일 0시) */
  nextOpen: number
  /** open: 마감 전, closed: 마감 뒤 (일요일 경기 뒤 채점, 다음 월요일 새 문제) */
  phase: 'open' | 'closed'
}

export function challengeSchedule(now: number): ChallengeSchedule {
  const k = new Date(now + KST_OFFSET_MS)
  const dayFromMonday = (k.getUTCDay() + 6) % 7
  const weekStart = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - dayFromMonday) - KST_OFFSET_MS
  const deadline = weekStart + CHALLENGE_DEADLINE_AFTER_MONDAY_MS
  return { weekStart, deadline, nextOpen: weekStart + 7 * DAY_MS, phase: now < deadline ? 'open' : 'closed' }
}

/** 남은 시간 「1일 3시간」 · 「5시간 20분」 · 「12분」 · 「1분 미만」 */
export function formatRemaining(ms: number): string {
  if (ms < 60 * 1000) return '1분 미만'
  const totalMin = Math.floor(ms / 60000)
  const d = Math.floor(totalMin / (24 * 60))
  const h = Math.floor((totalMin % (24 * 60)) / 60)
  const m = totalMin % 60
  if (d > 0) return h > 0 ? `${d}일 ${h}시간` : `${d}일`
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`
  return `${m}분`
}

/** 화면 문구: 마감 전이면 「마감까지 1일 3시간」, 마감 뒤면 「제출 마감 · 일요일 경기 뒤 채점」 */
export function challengeStatusText(s: ChallengeSchedule, now: number): string {
  return s.phase === 'open' ? `마감까지 ${formatRemaining(s.deadline - now)}` : '제출 마감 · 일요일 경기 뒤 채점'
}
