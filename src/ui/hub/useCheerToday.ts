import { cheeredAnyToday } from '../../domain/hub/news'
import { useNow } from '../shared/useNow'
import { useHubData } from './useHubData'

/**
 * 오늘의 응원 상태 — 홈 탭의 응원 점과 「오늘의 소식」의 「오늘의 응원」 카드가 같은 기준을 쓴다.
 * done: 로그인했고 오늘(이 기기 날짜) 한 번이라도 응원함, nudge: 로그인했는데 오늘 아직 응원하지 않음(점)
 */
export function useCheerToday(): { done: boolean; nudge: boolean } {
  const d = useHubData()
  const now = useNow()
  const userId = d.account?.id ?? null
  if (userId === null || !d.cheerReady) return { done: false, nudge: false }
  const done = cheeredAnyToday(d.cheers, userId, now)
  return { done, nudge: !done }
}
