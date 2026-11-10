import { useEffect, useState, type ReactNode } from 'react'
import { demoCommunitySeeds, openCommunityRepository } from '../../data/registry'
import type { CommunityRepository } from '../../data/source'
import { useAuth } from '../auth/AuthContext'
import { useLeagueState } from '../shared/LeagueContext'
import { CommunityContext, type CommunityState } from './CommunityContext'

type Props = {
  /** registry 대신 쓸 저장소 (테스트용). 없으면 리그 기록으로 만든 예시 글과 함께 브라우저 저장소를 연다 */
  repository?: CommunityRepository
  children: ReactNode
}

/** 커뮤니티 저장소를 열고 글 목록을 구독해 하위 화면(커뮤니티, 선수 카드)에 넘긴다 */
export default function CommunityProvider({ repository, children }: Props) {
  const [state, setState] = useState<CommunityState>({ status: 'loading' })
  // 예시 글("데모 게시글")은 리그 선수 기록으로 만들므로 리그가 준비된 뒤에 연다
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
    let opened: CommunityRepository | undefined
    ;(async () => {
      const seeds = league ? demoCommunitySeeds(league) : []
      const repo = repository ?? (opened = await openCommunityRepository({ seeds, user: accountId && nickname ? { id: accountId, name: nickname } : null }))
      if (!alive) return
      // 목록을 읽는 동안의 변경을 놓치지 않게 먼저 구독한다
      off = repo.subscribe((posts) => alive && setState((s) => (s.status === 'ready' ? { ...s, posts } : s)))
      const [user, posts] = await Promise.all([repo.currentUser(), repo.list()])
      if (!alive) return
      setOpenedFor(accountId)
      setState({ status: 'ready', repo, user, posts })
    })().catch((e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
      off?.()
      opened?.close?.()
    }
  }, [repository, league, authReady, accountId, nickname])

  // 계정이 바뀌어 다시 여는 동안에는 불러오는 중 (예전 계정·로그아웃 상태를 보고 판단하지 않게)
  const value = !repository && state.status === 'ready' && openedFor !== accountId ? { status: 'loading' as const } : state
  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>
}
