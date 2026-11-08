import { useEffect, useState, type ReactNode } from 'react'
import { openAuthRepository } from '../../data/registry'
import type { AuthRepository } from '../../data/source'
import { AuthContext, type AuthState } from './AuthContext'

/** 계정 저장소를 열고 로그인 상태를 구독한다 (다른 탭에서 로그인·로그아웃해도 따라간다) */
export default function AuthProvider({ repository, children }: { repository?: AuthRepository; children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    let off: (() => void) | undefined
    let opened: AuthRepository | undefined
    ;(async () => {
      const repo = repository ?? (opened = await openAuthRepository())
      if (!alive) return
      off = repo.subscribe((account) => alive && setState({ status: 'ready', repo, account }))
      const account = await repo.current()
      if (alive) setState({ status: 'ready', repo, account })
    })().catch((e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
      off?.()
      opened?.close?.()
    }
  }, [repository])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
