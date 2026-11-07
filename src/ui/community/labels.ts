import type { CommunityPost } from '../../data/types'

/** 작성자 표시: 내 글은 "나", 남의 글은 "팬" (프로필은 로그인을 붙이는 7-2에서) */
export const authorName = (post: CommunityPost, userId: string | null) => (post.authorId === userId ? '나' : '팬')
