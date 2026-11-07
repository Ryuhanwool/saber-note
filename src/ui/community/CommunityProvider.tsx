import { useEffect, useState, type ReactNode } from 'react'
import { demoCommunitySeeds, openCommunityRepository } from '../../data/registry'
import type { CommunityRepository } from '../../data/source'
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
  const league = leagueState.status === 'ready' ? leagueState.league : null

  useEffect(() => {
    if (!repository && !league) return
    let alive = true
    let off: (() => void) | undefined
    let opened: CommunityRepository | undefined
    ;(async () => {
      const seeds = league ? demoCommunitySeeds({ hitters: league.hitters.map((p) => p.raw), pitchers: league.pitchers.map((p) => p.raw) }) : []
      const repo = repository ?? (opened = await openCommunityRepository({ seeds }))
      if (!alive) return
      // 목록을 읽는 동안의 변경을 놓치지 않게 먼저 구독한다
      off = repo.subscribe((posts) => alive && setState((s) => (s.status === 'ready' ? { ...s, posts } : s)))
      const [user, posts] = await Promise.all([repo.currentUser(), repo.list()])
      if (alive) setState({ status: 'ready', repo, user, posts })
    })().catch((e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
      off?.()
      opened?.close?.()
    }
  }, [repository, league])

  return <CommunityContext.Provider value={state}>{children}</CommunityContext.Provider>
}
