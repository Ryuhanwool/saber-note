import type { CommunityPost, CommunityUser } from '../types'

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export const newestFirst = (posts: CommunityPost[]) => [...posts].sort((a, b) => b.createdAt - a.createdAt)

/** 예전에 저장한 글에 없는 필드(caution 등)를 기본값으로 채운다 */
export const normalizePost = (p: CommunityPost): CommunityPost => ({ ...p, authorName: p.authorName ?? null, masked: p.masked ?? false, caution: p.caution ?? false })

// 좋아요·신고·삭제 규칙은 domain/community/posts.ts와 같다.
// data 층은 domain을 import할 수 없어서, 저장소가 지켜야 할 최소 규칙만 여기 둔다 (서버에서는 접근 정책이 맡는다).

export function toggledLikes(p: CommunityPost, userId: string): string[] {
  return p.likes.includes(userId) ? p.likes.filter((x) => x !== userId) : [...p.likes, userId]
}

export function reportedBy(p: { authorId: string; reports: string[] }, userId: string): string[] {
  if (p.authorId === userId) throw new Error('자기 글은 신고할 수 없습니다.')
  return p.reports.includes(userId) ? p.reports : [...p.reports, userId]
}

export function assertAuthor(p: { authorId: string }, userId: string) {
  if (p.authorId !== userId) throw new Error('자기 글만 지울 수 있습니다.')
}

/** 쓰기는 로그인한 사용자만 (로그아웃 상태면 저장소의 사용자가 null) */
export function requireUser(user: CommunityUser | null): CommunityUser {
  if (!user) throw new Error('로그인이 필요합니다.')
  return user
}

/**
 * 저장소의 사용자: 계정이 있으면 그 계정, null이면 로그아웃 상태.
 * 넣지 않으면(테스트 등) 예전처럼 이 저장소가 익명 사용자(`local:…`)를 만든다 (로그인 기능 전 동작).
 */
export type RepoUser = CommunityUser | null | undefined
