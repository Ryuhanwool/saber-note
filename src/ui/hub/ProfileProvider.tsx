import { useEffect, useState, type ReactNode } from 'react'
import { openProfileRepository } from '../../data/registry'
import type { ProfileRepository } from '../../data/source'
import type { ProfileSnapshot } from '../../data/types'
import { useAuth } from '../auth/AuthContext'
import { ProfileContext, type ProfileState } from './ProfileContext'

type Props = {
  /** registry 대신 쓸 저장소를 계정마다 만드는 함수 (테스트용) */
  open?: (user: { id: string; name: string } | null) => ProfileRepository
  children: ReactNode
}

/** 사진 주소 (주소를 만들 수 없는 환경이면 null) */
const urlOf = (image: Blob | null) => (image && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(image) : null)

/** 로그인한 계정의 프로필 저장소(프로필 사진·마지막으로 본 때)를 열고 구독한다. 계정이 바뀌면 다시 연다 */
export default function ProfileProvider({ open, children }: Props) {
  const [state, setState] = useState<ProfileState & { openedFor?: string | null }>({ status: 'loading' })
  const auth = useAuth()
  const authReady = auth.status !== 'loading'
  const account = auth.status === 'ready' ? auth.account : null
  const accountId = account?.id ?? null
  const nickname = account?.nickname ?? null

  useEffect(() => {
    if (!authReady) return
    let alive = true
    let off: (() => void) | undefined
    let repo: ProfileRepository | undefined
    let url: string | null = null
    const user = accountId && nickname ? { id: accountId, name: nickname } : null
    const apply = (s: ProfileSnapshot) => {
      if (!alive) return
      if (url) URL.revokeObjectURL(url)
      url = urlOf(s.image)
      setState({ status: 'ready', repo: repo!, user, imageUrl: url, seen: s.seen, openedFor: accountId })
    }
    ;(async () => {
      repo = open ? open(user) : await openProfileRepository({ user })
      if (!alive) return
      off = repo.subscribe(apply)
      apply(await repo.snapshot())
    })().catch((e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
      off?.()
      repo?.close?.()
      if (url) URL.revokeObjectURL(url)
    }
  }, [open, authReady, accountId, nickname])

  // 계정이 바뀌어 다시 여는 동안에는 불러오는 중 (예전 계정의 사진을 보여 주지 않게)
  const value: ProfileState = state.status === 'ready' && state.openedFor !== accountId ? { status: 'loading' } : state
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}
