// 계정 규칙 (시연용 로그인): 닉네임 검사(작성 제한, 중복, 예약어), 비밀번호 규칙, 작성자 표시. 응원 팀 → 테마는 domain/theme/teams.ts
import { DEMO_AUTHOR_ID, DEMO_ACCOUNT_NICKNAME, isAnonymousAuthor } from '../../data/types'
import { moderate } from '../community/moderation'

export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 12
export const PASSWORD_MIN = 6
const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9_]+$/

/** 화면에서 쓰는 이름과 데모 계정 닉네임은 닉네임으로 쓸 수 없다 */
export const RESERVED_NICKNAMES = ['나', '팬', '익명팬', '익명', '데모게시글', '데모응원', '데모', '운영자', '관리자', 'admin', DEMO_ACCOUNT_NICKNAME]

/** 중복 비교용: 띄어쓰기를 지우고 소문자로 */
export const nicknameKey = (nickname: string) => nickname.replace(/\s+/g, '').toLowerCase()

export type CheckResult = { ok: true; value: string } | { ok: false; message: string }

/**
 * 닉네임 검사. 늘 보이는 이름이라 작성 제한의 차단·애매함은 물론 허용 수준의 거친 표현도 쓸 수 없다.
 * takenKeys: 이 브라우저에 이미 있는 닉네임들의 nicknameKey
 */
export function checkNickname(nickname: string, takenKeys: ReadonlySet<string>): CheckResult {
  const n = nickname.trim()
  if (n.length < NICKNAME_MIN || n.length > NICKNAME_MAX) return { ok: false, message: `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 써 주세요.` }
  if (!NICKNAME_PATTERN.test(n)) return { ok: false, message: '닉네임에는 한글, 영문, 숫자, 밑줄(_)만 쓸 수 있어요.' }
  const key = nicknameKey(n)
  if (RESERVED_NICKNAMES.some((r) => nicknameKey(r) === key)) return { ok: false, message: '이 닉네임은 쓸 수 없어요. 다른 닉네임을 골라 주세요.' }
  if (moderate(n).level !== 'ok') return { ok: false, message: '닉네임에 쓸 수 없는 표현이 있어요. 다른 닉네임을 골라 주세요.' }
  if (takenKeys.has(key)) return { ok: false, message: '이미 이 브라우저에서 쓰고 있는 닉네임이에요.' }
  return { ok: true, value: n }
}

export function checkPassword(password: string, confirm: string): CheckResult {
  if (password.length < PASSWORD_MIN) return { ok: false, message: `비밀번호는 ${PASSWORD_MIN}자 이상으로 써 주세요.` }
  if (password !== confirm) return { ok: false, message: '비밀번호 확인이 맞지 않아요.' }
  return { ok: true, value: password }
}

/**
 * 작성자 표시: 시연용 예시는 demoLabel, 로그인 전에 쓴 글은 「익명 팬」, 그 밖에는 쓸 때 저장한 닉네임.
 * (닉네임이 저장되지 않은 글은 「팬」)
 */
export function authorLabel(p: { authorId: string; authorName: string | null }, demoLabel: string): string {
  if (p.authorId === DEMO_AUTHOR_ID) return demoLabel
  if (isAnonymousAuthor(p.authorId)) return '익명 팬'
  return p.authorName ?? '팬'
}
