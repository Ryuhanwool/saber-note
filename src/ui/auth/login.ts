import { useLocation, useNavigate } from 'react-router'

const DRAFT_PREFIX = 'saber-note-draft:'

/** 로그인 화면 주소. next: 로그인한 뒤 돌아올 화면 */
export const loginPath = (next: string) => `/login?${new URLSearchParams({ next })}`

/** 돌아갈 주소는 이 앱 안 경로만 (다른 사이트로 보내지 않는다) */
export const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/')

/** 써 두던 글자를 이 탭에 잠시 보관한다 (사진은 보관하지 않는다). 저장소를 쓸 수 없으면 조용히 넘어간다 */
export function saveDraft(key: string, text: string) {
  try {
    if (text.trim()) sessionStorage.setItem(DRAFT_PREFIX + key, text)
  } catch {
    // 보관하지 못해도 로그인 안내는 계속한다
  }
}

/** 보관한 글자를 꺼내고 지운다. 없으면 '' */
export function takeDraft(key: string): string {
  try {
    const t = sessionStorage.getItem(DRAFT_PREFIX + key) ?? ''
    sessionStorage.removeItem(DRAFT_PREFIX + key)
    return t
  } catch {
    return ''
  }
}

/** 보관한 글자를 지우지 않고 읽는다 (화면이 처음 그려질 때 읽고, 저장한 뒤 clearDraft로 지운다). 없으면 '' */
export function peekDraft(key: string): string {
  try {
    return sessionStorage.getItem(DRAFT_PREFIX + key) ?? ''
  } catch {
    return ''
  }
}

export function clearDraft(key: string) {
  try {
    sessionStorage.removeItem(DRAFT_PREFIX + key)
  } catch {
    // 지우지 못해도 괜찮다
  }
}

/**
 * 로그인이 필요한 동작 앞에서 부른다. 로그인돼 있으면 true.
 * 아니면 (써 두던 글을 보관하고) 로그인 화면으로 보내고 false. 로그인한 뒤에는 next(기본은 지금 화면)로 돌아온다.
 */
export function useRequireLogin() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  return (user: unknown, opts: { next?: string; draft?: { key: string; text: string } } = {}): boolean => {
    if (user) return true
    if (opts.draft) saveDraft(opts.draft.key, opts.draft.text)
    navigate(loginPath(opts.next ?? pathname + search))
    return false
  }
}
