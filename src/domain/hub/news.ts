// 새 소식·새 글 수: 커뮤니티 글과 판매글, 챌린지 마감 알림
import type { CheerEvent, CommunityPost, MarketListing } from '../../data/types'
import { sameDay } from '../cheer/cheer'
import { isHiddenByReports } from '../community/posts'
import type { ChallengeSchedule } from '../games/schedule'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/** 새 소식에 보여 주는 최대 개수 */
export const NEWS_LIMIT = 10
/** 새 소식으로 보여 주는 기간 */
export const NEWS_WINDOW_MS = 7 * DAY_MS
/** 마감 알림을 띄우는 때: 마감 24시간 전부터 */
export const CHALLENGE_REMIND_MS = DAY_MS

type Item = { authorId: string; createdAt: number; reports: readonly string[] }

/** 최근 hours시간 동안 올라온 글 수 (예시 글 포함, 가려진 글 제외) */
export const recentCount = (items: readonly Item[], now: number, hours = 24) =>
  items.filter((x) => !isHiddenByReports(x) && x.createdAt <= now && now - x.createdAt < hours * HOUR_MS).length

/** 「마지막으로 본 때」가 없을 때 쓰는 기준 (처음이면 최근 24시간을 새 것으로 본다) */
export const seenOrDefault = (since: number | null, now: number) => since ?? now - DAY_MS

/** 마지막으로 본 뒤 다른 사람이 올린 글이 있는지 (탭 바 점) */
export const hasNewSince = (items: readonly Item[], userId: string | null, since: number | null, now: number) => {
  const from = seenOrDefault(since, now)
  return items.some((x) => x.authorId !== userId && !isHiddenByReports(x) && x.createdAt > from && x.createdAt <= now)
}

/** 오늘(이 기기 날짜, 「응원하기」 하루 1번과 같은 기준) 한 번이라도 응원했는지 */
export const cheeredAnyToday = (cheers: readonly CheerEvent[], userId: string, now: number) =>
  cheers.some((c) => c.userId === userId && sameDay(c.createdAt, now))

export type NewsItem =
  | { kind: 'post'; id: string; at: number; text: string; fresh: boolean }
  | { kind: 'listing'; id: string; at: number; text: string; fresh: boolean }
  | { kind: 'challenge'; id: string; at: number; deadline: number; fresh: boolean }

/**
 * 새 소식: 최근 7일 동안 다른 사람이 올린 커뮤니티 글·판매글과, 마감 24시간 전부터의 챌린지 마감 알림. 최신순 10개.
 * fresh는 마지막으로 본 뒤에 생긴 것 (점 표시).
 */
export function newsItems(input: {
  posts: readonly CommunityPost[]
  listings: readonly MarketListing[]
  userId: string | null
  since: number | null
  now: number
  challenge: ChallengeSchedule | null
  limit?: number
}): { items: NewsItem[]; fresh: number } {
  const { userId, now } = input
  const since = seenOrDefault(input.since, now)
  const ok = (x: Item) => x.authorId !== userId && !isHiddenByReports(x) && x.createdAt <= now && now - x.createdAt < NEWS_WINDOW_MS
  const items: NewsItem[] = [
    ...input.posts.filter(ok).map((p) => ({ kind: 'post' as const, id: p.id, at: p.createdAt, text: p.text, fresh: p.createdAt > since })),
    ...input.listings.filter(ok).map((l) => ({ kind: 'listing' as const, id: l.id, at: l.createdAt, text: l.title, fresh: l.createdAt > since })),
  ]
  const c = input.challenge
  if (c && c.phase === 'open' && c.deadline - now <= CHALLENGE_REMIND_MS) {
    const at = c.deadline - CHALLENGE_REMIND_MS
    items.push({ kind: 'challenge', id: `challenge:${c.weekStart}`, at, deadline: c.deadline, fresh: at > since })
  }
  const top = items.sort((a, b) => b.at - a.at).slice(0, input.limit ?? NEWS_LIMIT)
  return { items: top, fresh: top.filter((x) => x.fresh).length }
}
