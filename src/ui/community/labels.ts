import type { CommunityPost } from '../../data/types'
import { isDemoPost } from '../../domain/community/posts'

/** 작성자 표시: 시연용 예시 글은 "데모 게시글", 내 글은 "나", 남의 글은 "팬" */
export const authorName = (post: CommunityPost, userId: string | null) =>
  isDemoPost(post) ? '데모 게시글' : post.authorId === userId ? '나' : '팬'
