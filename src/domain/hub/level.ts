// 팬 레벨: 활동(응원하기·응원 메시지·커뮤니티 글·판매글·라인업 저장)으로 점수를 쌓아 레벨을 정한다.
// 반복하기 쉬운 활동은 하루(한국 날짜)에 점수를 받는 횟수에 한도가 있다.
import { DEMO_ACCOUNT_ID, type CheerEvent, type CheerMessage, type CommunityPost, type MarketListing } from '../../data/types'
import { isHiddenByReports } from '../community/posts'
import { dayKeyKST } from '../games/calendar'

export type FanActivityKind = 'cheer' | 'cheer-message' | 'post' | 'listing' | 'lineup'
export type FanActivity = { kind: FanActivityKind; at: number }

export const FAN_ACTIVITY_LABEL: Record<FanActivityKind, string> = {
  cheer: '응원하기', 'cheer-message': '응원 메시지', post: '커뮤니티 글', listing: '판매글', lineup: '라인업 저장',
}

/** 활동 한 번의 점수 */
export const FAN_POINTS: Record<FanActivityKind, number> = { cheer: 1, 'cheer-message': 2, post: 3, listing: 3, lineup: 5 }

/** 하루(한국 날짜)에 점수를 받는 최대 횟수. 라인업 저장은 계정마다 1번이라 하루 한도 대신 평생 1번 */
export const FAN_DAILY_LIMIT: Record<FanActivityKind, number> = { cheer: 10, 'cheer-message': 3, post: 3, listing: 2, lineup: 1 }

/** 하루 한도가 아니라 계정마다 한 번만 점수를 받는 활동 */
const ONCE: ReadonlySet<FanActivityKind> = new Set(['lineup'])

export const FAN_KINDS = Object.keys(FAN_POINTS) as FanActivityKind[]

export type FanLevelDef = { level: number; name: string; min: number }

export const FAN_LEVELS: readonly FanLevelDef[] = [
  { level: 1, name: '새내기 팬', min: 0 },
  { level: 2, name: '응원 팬', min: 10 },
  { level: 3, name: '열성 팬', min: 30 },
  { level: 4, name: '골수 팬', min: 60 },
  { level: 5, name: '전설의 팬', min: 100 },
]

/** 데모 계정은 시연할 때 배지가 잘 보이게 중간 레벨(Lv.3 열성 팬)에서 시작한다 */
export const DEMO_START_POINTS = 35

export const startPoints = (accountId: string) => (accountId === DEMO_ACCOUNT_ID ? DEMO_START_POINTS : 0)

/** 이 계정의 활동 목록. 지운 글은 목록에 없고, 신고 3번으로 가려진 글·메시지·판매글은 세지 않는다 */
export function fanActivities(input: {
  userId: string
  cheers: readonly CheerEvent[]
  cheerMessages: readonly CheerMessage[]
  posts: readonly CommunityPost[]
  listings: readonly MarketListing[]
  lineup: { updatedAt: number } | null
}): FanActivity[] {
  const { userId } = input
  const mine = <T extends { authorId: string; reports: readonly string[]; createdAt: number }>(xs: readonly T[], kind: FanActivityKind) =>
    xs.filter((x) => x.authorId === userId && !isHiddenByReports(x)).map((x) => ({ kind, at: x.createdAt }))
  return [
    ...input.cheers.filter((c) => c.userId === userId).map((c) => ({ kind: 'cheer' as const, at: c.createdAt })),
    ...mine(input.cheerMessages, 'cheer-message'),
    ...mine(input.posts, 'post'),
    ...mine(input.listings, 'listing'),
    ...(input.lineup ? [{ kind: 'lineup' as const, at: input.lineup.updatedAt }] : []),
  ]
}

export type FanScore = {
  points: number
  /** 시작 점수 (데모 계정) */
  start: number
  byKind: Record<FanActivityKind, { count: number; counted: number; points: number }>
}

/** 활동 점수. 활동은 시각 순으로 세고, 하루 한도를 넘은 활동은 점수 없이 횟수만 센다 */
export function fanScore(activities: readonly FanActivity[], start = 0): FanScore {
  const byKind = Object.fromEntries(FAN_KINDS.map((k) => [k, { count: 0, counted: 0, points: 0 }])) as FanScore['byKind']
  const perDay = new Map<string, number>()
  for (const a of [...activities].sort((x, y) => x.at - y.at)) {
    const k = byKind[a.kind]
    k.count++
    const key = ONCE.has(a.kind) ? a.kind : `${a.kind}|${dayKeyKST(new Date(a.at))}`
    const used = perDay.get(key) ?? 0
    if (used >= FAN_DAILY_LIMIT[a.kind]) continue
    perDay.set(key, used + 1)
    k.counted++
    k.points += FAN_POINTS[a.kind]
  }
  const earned = FAN_KINDS.reduce((s, k) => s + byKind[k].points, 0)
  return { points: start + earned, start, byKind }
}

export type FanLevel = FanLevelDef & { points: number; next: FanLevelDef | null; toNext: number | null }

export function fanLevel(points: number): FanLevel {
  const i = FAN_LEVELS.findLastIndex((l) => points >= l.min)
  const cur = FAN_LEVELS[Math.max(0, i)]
  const next = FAN_LEVELS[i + 1] ?? null
  return { ...cur, points, next, toNext: next ? next.min - points : null }
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 최근 days일 동안 이 사용자가 누른 「응원하기」 수 (이번 주 응원 순위와 같은 기준) */
export const weeklyCheers = (cheers: readonly CheerEvent[], userId: string, now: number, days = 7) =>
  cheers.filter((c) => c.userId === userId && now - c.createdAt < days * DAY_MS && c.createdAt <= now).length
