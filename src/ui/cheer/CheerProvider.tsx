import { useEffect, useState, type ReactNode } from 'react'
import { demoCheerSeeds, openCheerRepository } from '../../data/registry'
import type { CheerRepository } from '../../data/source'
import { useAuth } from '../auth/AuthContext'
import { useLeagueState } from '../shared/LeagueContext'
import { CheerContext, type CheerState } from './CheerContext'

type Props = {
  /** registry 대신 쓸 저장소 (테스트용). 없으면 리그 기록으로 만든 예시 응원과 함께 브라우저 저장소를 연다 */
  repository?: CheerRepository
  children: ReactNode
}

/** 응원방 저장소를 열고 상태를 구독해 하위 화면(응원방, 선수 카드, 커뮤니티 순위)에 넘긴다 */
export default function CheerProvider({ repository, children }: Props) {
  const [state, setState] = useState<CheerState>({ status: 'loading' })
  const leagueState = useLeagueState()
  // 예시 글은 처음 불러온 선수 명단으로 만든다 (시연용 날짜 이동으로 저장소를 다시 열지 않게)
  const league = leagueState.status === 'ready' ? leagueState.roster : null
  // 로그인한 계정이 작성자가 된다. 로그인·로그아웃하면 그 계정으로 저장소를 다시 연다 (로그아웃 상태면 읽기만)
  const auth = useAuth()
  const authReady = auth.status !== 'loading'
  const account = auth.status === 'ready' ? auth.account : null
  const accountId = account?.id ?? null
  const nickname = account?.nickname ?? null
  /** 지금 열린 저장소가 어느 계정으로 열렸는지 (계정이 바뀌어 다시 여는 동안 예전 상태를 보여 주지 않으려고) */
  const [openedFor, setOpenedFor] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!repository && (!league || !authReady)) return
    let alive = true
    let off: (() => void) | undefined
    let opened: CheerRepository | undefined
    ;(async () => {
      const seeds = league ? demoCheerSeeds(league) : undefined
      const repo = repository ?? (opened = await openCheerRepository({ seeds, user: accountId && nickname ? { id: accountId, name: nickname } : null }))
      if (!alive) return
      off = repo.subscribe((snapshot) => alive && setState((s) => (s.status === 'ready' ? { ...s, snapshot } : s)))
      const [user, snapshot] = await Promise.all([repo.currentUser(), repo.snapshot()])
      if (!alive) return
      setOpenedFor(accountId)
      setState({ status: 'ready', repo, user, snapshot })
    })().catch((e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
      off?.()
      opened?.close?.()
    }
  }, [repository, league, authReady, accountId, nickname])

  // 계정이 바뀌어 다시 여는 동안에는 불러오는 중 (예전 계정·로그아웃 상태를 보고 판단하지 않게)
  const value = !repository && state.status === 'ready' && openedFor !== accountId ? { status: 'loading' as const } : state
  return <CheerContext.Provider value={value}>{children}</CheerContext.Provider>
}
