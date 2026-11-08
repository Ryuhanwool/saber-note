import type { CommunityPost } from '../../data/types'
import { DEFAULT_DISPLAY_SETTINGS } from '../../data/types'
import { maskProfanity } from '../../domain/community/moderation'
import { authorLabel } from '../../domain/auth/account'
import { useSettings } from '../settings/SettingsContext'

/** 작성자 표시: 시연용 예시 글은 "데모 게시글"(응원방은 "데모 응원"), 로그인 기능 전에 쓴 글은 "익명 팬", 그 밖에는 쓸 때의 닉네임 */
export const authorName = (post: { authorId: string; authorName: string | null }, demoLabel = '데모 게시글') => authorLabel(post, demoLabel)

/**
 * 화면에 보일 본문. 「주의」 글은 걸린 표현을 늘 가리고, 그 밖에는 읽는 사람의 「거친 표현 가리기」 설정을 따른다.
 * (설정 제공자가 없으면 기본값: 가리기 켜짐)
 */
export function useShownText(post: Pick<CommunityPost, 'text' | 'caution'>): string {
  const maskOn = useSettings()?.settings.maskProfanity ?? DEFAULT_DISPLAY_SETTINGS.maskProfanity
  return post.caution || maskOn ? maskProfanity(post.text) : post.text
}
