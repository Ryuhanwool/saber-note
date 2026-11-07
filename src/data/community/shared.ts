import type { CommunityPost } from '../types'

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export const newestFirst = (posts: CommunityPost[]) => [...posts].sort((a, b) => b.createdAt - a.createdAt)

// 좋아요·신고·삭제 규칙은 domain/community/posts.ts와 같다.
// data 층은 domain을 import할 수 없어서, 저장소가 지켜야 할 최소 규칙만 여기 둔다 (서버에서는 접근 정책이 맡는다).

export function toggledLikes(p: CommunityPost, userId: string): string[] {
  return p.likes.includes(userId) ? p.likes.filter((x) => x !== userId) : [...p.likes, userId]
}

export function reportedBy(p: CommunityPost, userId: string): string[] {
  if (p.authorId === userId) throw new Error('자기 글은 신고할 수 없습니다.')
  return p.reports.includes(userId) ? p.reports : [...p.reports, userId]
}

export function assertAuthor(p: CommunityPost, userId: string) {
  if (p.authorId !== userId) throw new Error('자기 글만 지울 수 있습니다.')
}
