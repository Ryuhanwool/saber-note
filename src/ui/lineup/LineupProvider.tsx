import { useEffect, useState, type ReactNode } from 'react'
import { openLineupRepository } from '../../data/registry'
import type { LineupRepository } from '../../data/source'
import { useAuth } from '../auth/AuthContext'
import { LineupContext, type LineupState } from './LineupContext'

type Props = {
  /** registry 대신 쓸 저장소를 계정마다 만드는 함수 (테스트용) */
  open?: (user: { id: string; name: string } | null) => LineupRepository
  children: ReactNode
}

/** 로그인한 계정의 라인업 저장소를 열고 내 라인업을 구독한다. 계정이 바뀌면 다시 연다 (로그아웃이면 읽기만) */
export default function LineupProvider({ open, children }: Props) {
  const [state, setState] = useState<LineupState & { openedFor?: string | null }>({ status: 'loading' })
  const auth = useAuth()
  const authReady = auth.status !== 'loading'
  const account = auth.status === 'ready' ? auth.account : null
  const accountId = account?.id ?? null
  const nickname = account?.nickname ?? null

  useEffect(() => {
    if (!authReady) return
    let alive = true
    let off: (() => void) | undefined
    let repo: LineupRepository | undefined
    const user = accountId && nickname ? { id: accountId, name: nickname } : null
    ;(async () => {
      repo = open ? open(user) : await openLineupRepository({ user })
      if (!alive) return
      off = repo.subscribe((mine) => alive && setState((s) => (s.status === 'ready' ? { ...s, mine } : s)))
      const mine = await repo.mine()
      if (!alive) return
      setState({ status: 'ready', repo, user, mine, openedFor: accountId })
    })().catch((e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
      off?.()
      repo?.close?.()
    }
  }, [open, authReady, accountId, nickname])

  // 계정이 바뀌어 다시 여는 동안에는 불러오는 중 (예전 계정의 라인업을 보여 주지 않게)
  const value: LineupState = state.status === 'ready' && state.openedFor !== accountId ? { status: 'loading' } : state
  return <LineupContext.Provider value={value}>{children}</LineupContext.Provider>
}
