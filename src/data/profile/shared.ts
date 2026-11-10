import type { CommunityUser } from '../types'

/** 로그아웃 상태의 「마지막으로 본 때」를 두는 열쇠 */
export const GUEST_KEY = 'guest'

/** 이 사용자의 기록 열쇠 (로그인한 계정 id, 아니면 손님) */
export const profileKey = (user: CommunityUser | null) => user?.id ?? GUEST_KEY
