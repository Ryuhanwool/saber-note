// 커뮤니티 글 규칙: 게시 검사, 도배 제한, 자동 태그, 신고 가리기, 선수별 집계.
// 서버(7-2)에서도 쓸 수 있게 브라우저 API에 의존하지 않는다.
import { DEMO_AUTHOR_ID, type CommunityPost, type MediaKind, type PlayerId } from '../../data/types'
import { moderate, type ModerationResult } from './moderation'

export const MAX_TEXT_LENGTH = 1000
export const MAX_FILES = 4
export const MAX_FILE_BYTES = 20 * 1024 * 1024
/** 도배 방지: 30초에 한 번 */
export const POST_INTERVAL_MS = 30_000
/** 신고가 이만큼 쌓이면 가린다 */
export const REPORT_HIDE_THRESHOLD = 3

export const MEDIA_KINDS: Record<string, MediaKind> = {
  'image/png': '사진',
  'image/jpeg': '사진',
  'image/webp': '사진',
  'image/gif': '움짤',
  'video/mp4': '영상',
  'video/webm': '영상',
}
export const ACCEPTED_TYPES = Object.keys(MEDIA_KINDS)

const DAY_MS = 24 * 60 * 60 * 1000

// ---------- 파일 ----------

export type FileInfo = { name: string; type: string; size: number }

/** 새로 고른 파일 중 올릴 수 있는 것(원래 순서의 번호)과, 안 되는 파일마다 이유 */
export function checkFiles(currentCount: number, files: readonly FileInfo[]): { accepted: number[]; errors: string[] } {
  const accepted: number[] = []
  const errors: string[] = []
  files.forEach((f, i) => {
    if (currentCount + accepted.length >= MAX_FILES) errors.push(`파일은 ${MAX_FILES}개까지 올릴 수 있어요`)
    else if (!MEDIA_KINDS[f.type]) errors.push(`${f.name}: PNG, JPG, WEBP, GIF, MP4, WEBM 파일만 올릴 수 있어요`)
    else if (f.size > MAX_FILE_BYTES) errors.push(`${f.name}: 20MB를 넘어요. 용량을 줄여서 다시 올려 주세요`)
    else accepted.push(i)
  })
  return { accepted, errors: [...new Set(errors)] }
}

// ---------- 게시 ----------

/** 다음 글을 올릴 수 있을 때까지 남은 시간(ms). 0이면 바로 가능 */
export const postWaitMs = (lastPostAt: number | null, now: number) =>
  lastPostAt === null ? 0 : Math.max(0, lastPostAt + POST_INTERVAL_MS - now)

/** 직접 단 태그 + 본문에 이름이 나온 선수 (중복 없이, 직접 단 태그가 먼저) */
export function autoTag(text: string, explicit: readonly PlayerId[], players: readonly { id: PlayerId; name: string }[]): PlayerId[] {
  const tags = new Set(explicit)
  for (const p of players) if (text.includes(p.name)) tags.add(p.id)
  return [...tags]
}

export type PostDraft = {
  text: string
  players: readonly PlayerId[]
  fileCount: number
  /** 애매하다는 경고를 보고도 「그래도 올리기」를 골랐는지 */
  confirmAmbiguous?: boolean
}

export type PreparedPost =
  | { ok: true; text: string; players: PlayerId[]; caution: boolean }
  | {
      ok: false
      reason: 'empty' | 'too-long' | 'too-many-files' | 'blocked' | 'needs-confirm' | 'too-soon'
      message: string
      moderation?: ModerationResult
      waitMs?: number
    }

/**
 * 글 하나를 올리기 전 검사. 막힐 이유가 있으면 ok: false.
 * 애매하면 'needs-confirm'으로 돌려주고, 작성자가 「그래도 올리기」를 고르면(confirmAmbiguous) 「주의」 글로 통과한다.
 * 본문은 원문 그대로 저장한다 (거친 표현은 읽는 사람의 설정에 따라 화면에 보일 때 가린다).
 */
export function preparePost(
  draft: PostDraft,
  ctx: { players: readonly { id: PlayerId; name: string }[]; lastPostAt: number | null; now: number },
): PreparedPost {
  const text = draft.text.trim()
  if (!text && draft.fileCount === 0) return { ok: false, reason: 'empty', message: '글이나 파일을 넣어 주세요.' }
  if (text.length > MAX_TEXT_LENGTH) return { ok: false, reason: 'too-long', message: `글은 ${MAX_TEXT_LENGTH}자까지 쓸 수 있어요.` }
  if (draft.fileCount > MAX_FILES) return { ok: false, reason: 'too-many-files', message: `파일은 ${MAX_FILES}개까지 올릴 수 있어요.` }
  const moderation = moderate(text, { names: ctx.players.map((p) => p.name) })
  if (moderation.level === 'block') {
    return { ok: false, reason: 'blocked', message: blockMessage(moderation), moderation }
  }
  if (moderation.level === 'ambiguous' && !draft.confirmAmbiguous) {
    return { ok: false, reason: 'needs-confirm', message: ambiguousMessage(moderation), moderation }
  }
  const waitMs = postWaitMs(ctx.lastPostAt, ctx.now)
  if (waitMs > 0) {
    return { ok: false, reason: 'too-soon', message: `도배를 막기 위해 30초에 한 번만 글을 올릴 수 있어요. ${Math.ceil(waitMs / 1000)}초 뒤에 다시 올려 주세요.`, waitMs }
  }
  return { ok: true, text, players: autoTag(text, draft.players, ctx.players), caution: moderation.level === 'ambiguous' }
}

/** 차단 안내: 어떤 이유, 어떤 표현 때문인지 */
export function blockMessage(m: Extract<ModerationResult, { level: 'block' }>): string {
  return `이대로는 올릴 수 없어요. ${m.details.join(' / ')}. 표현을 고쳐 주세요.`
}

/** 애매함 안내: 왜 경고하는지와 고를 수 있는 것 */
export function ambiguousMessage(m: Extract<ModerationResult, { level: 'ambiguous' }>): string {
  return `${m.details.join(' / ')}. 고쳐 쓰거나, 그래도 올리면 「주의」 표시가 붙고 그 표현은 늘 ●●로 가려져요.`
}

// ---------- 신고·좋아요·삭제 ----------

/** 시연용 예시 글("데모 게시글")인지 */
export const isDemoPost = (p: CommunityPost) => p.authorId === DEMO_AUTHOR_ID

export const isHiddenByReports = (p: CommunityPost) => p.reports.length >= REPORT_HIDE_THRESHOLD
export const canReport = (p: CommunityPost, userId: string | null) => userId !== null && p.authorId !== userId && !p.reports.includes(userId)
export const canDelete = (p: CommunityPost, userId: string | null) => userId !== null && p.authorId === userId

// ---------- 선수별 ----------

type Named = { id: PlayerId; name: string }

/** 이 선수 이야기인지: 태그가 달렸거나 본문에 이름이 나온다 */
export const mentions = (post: CommunityPost, player: Named) => post.players.includes(player.id) || post.text.includes(player.name)

export const relatedPosts = (posts: readonly CommunityPost[], player: Named) => posts.filter((x) => mentions(x, player))

/** 선수 카드용: 관련 글 수, 최근 24시간 글 수 */
export function playerBuzz(posts: readonly CommunityPost[], player: Named, now: number) {
  const rel = relatedPosts(posts, player)
  return { total: rel.length, last24h: rel.filter((x) => now - x.createdAt < DAY_MS).length }
}

/** 최근 days일 동안 많이 이야기된 선수 (글 수 많은 순, 같으면 먼저 나온 선수) */
export function topDiscussed(posts: readonly CommunityPost[], players: readonly Named[], now: number, n = 5, days = 7): { id: PlayerId; count: number }[] {
  const recent = posts.filter((x) => now - x.createdAt < days * DAY_MS)
  return players
    .map((p) => ({ id: p.id, count: recent.filter((x) => mentions(x, p)).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

/** "방금", "5분 전", "3시간 전", "2일 전" */
export function timeAgo(createdAt: number, now: number): string {
  const s = (now - createdAt) / 1000
  if (s < 60) return '방금'
  if (s < 3600) return `${Math.floor(s / 60)}분 전`
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`
  return `${Math.floor(s / 86400)}일 전`
}
