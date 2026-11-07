// 선수 응원방 규칙: 응원 메시지 검사, 「응원하기」 하루 1번, 누적 수, 이번 주 응원 순위.
// 메시지 작성 제한은 커뮤니티 규칙(domain/community)을 그대로 쓴다.
import type { CheerEvent, CheerMessage, PlayerId } from '../../data/types'
import type { ModerationResult } from '../community/moderation'
import { preparePost } from '../community/posts'

/** 응원 메시지 최대 글자 수 */
export const MAX_CHEER_LENGTH = 200

const DAY_MS = 24 * 60 * 60 * 1000

export type PreparedCheer =
  | { ok: true; text: string; caution: boolean }
  | {
      ok: false
      reason: 'empty' | 'too-long' | 'blocked' | 'needs-confirm' | 'too-soon'
      message: string
      moderation?: ModerationResult
      waitMs?: number
    }

/**
 * 응원 메시지 하나를 올리기 전 검사. 커뮤니티 글과 같은 작성 제한(차단, 애매하면 경고 후 선택, 30초 도배 제한)을 쓴다.
 * lastPostAt은 이 사용자가 마지막으로 올린 응원 메시지 시각 (어느 선수 응원방이든).
 */
export function prepareCheerMessage(
  draft: { text: string; confirmAmbiguous?: boolean },
  ctx: { players: readonly { id: PlayerId; name: string }[]; lastPostAt: number | null; now: number },
): PreparedCheer {
  const text = draft.text.trim()
  if (!text) return { ok: false, reason: 'empty', message: '응원 메시지를 써 주세요.' }
  if (text.length > MAX_CHEER_LENGTH) return { ok: false, reason: 'too-long', message: `응원 메시지는 ${MAX_CHEER_LENGTH}자까지 쓸 수 있어요.` }
  const r = preparePost({ text, players: [], fileCount: 0, confirmAmbiguous: draft.confirmAmbiguous }, ctx)
  if (r.ok) return { ok: true, text: r.text, caution: r.caution }
  if (r.reason === 'too-many-files') throw new Error('응원 메시지에는 파일이 없습니다.')
  return { ok: false, reason: r.reason, message: r.message.replace('글을 올릴', '응원 메시지를 올릴'), moderation: r.moderation, waitMs: r.waitMs }
}

/** 이 사용자가 마지막으로 올린 응원 메시지 시각 (도배 제한용). 없으면 null */
export function lastMessageAt(messages: readonly CheerMessage[], userId: string): number | null {
  const mine = messages.filter((m) => m.authorId === userId)
  return mine.length ? Math.max(...mine.map((m) => m.createdAt)) : null
}

/** 이 선수 응원방의 메시지, 최신순 */
export const messagesFor = (messages: readonly CheerMessage[], playerId: PlayerId) =>
  messages.filter((m) => m.playerId === playerId).sort((a, b) => b.createdAt - a.createdAt)

/** 이 기기의 날짜가 같은지 (「응원하기」 하루 1번 기준: 자정에 다시 누를 수 있다) */
export function sameDay(a: number, b: number): boolean {
  const x = new Date(a)
  const y = new Date(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}

/** 오늘 이 선수를 이미 응원했는지 */
export const cheeredToday = (cheers: readonly CheerEvent[], playerId: PlayerId, userId: string, now: number) =>
  cheers.some((c) => c.playerId === playerId && c.userId === userId && sameDay(c.createdAt, now))

/** 선수 카드·응원방용: 누적 응원 수와 최근 days일 응원 수 */
export function cheerCount(cheers: readonly CheerEvent[], playerId: PlayerId, now: number, days = 7) {
  const mine = cheers.filter((c) => c.playerId === playerId)
  return { total: mine.length, week: mine.filter((c) => now - c.createdAt < days * DAY_MS).length }
}

/** 이번 주 응원 순위: 최근 days일 「응원하기」 수 많은 순 (같으면 선수 목록에서 먼저 나온 선수). 메시지 수는 세지 않는다 */
export function topCheered(
  cheers: readonly CheerEvent[],
  players: readonly { id: PlayerId }[],
  now: number,
  n = 5,
  days = 7,
): { id: PlayerId; count: number }[] {
  const counts = new Map<PlayerId, number>()
  for (const c of cheers) if (now - c.createdAt < days * DAY_MS) counts.set(c.playerId, (counts.get(c.playerId) ?? 0) + 1)
  return players
    .map((p) => ({ id: p.id, count: counts.get(p.id) ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}
