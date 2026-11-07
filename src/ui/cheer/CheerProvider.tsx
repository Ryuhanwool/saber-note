import { useEffect, useState, type ReactNode } from 'react'
import { demoCheerSeeds, openCheerRepository } from '../../data/registry'
import type { CheerRepository } from '../../data/source'
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
  const league = leagueState.status === 'ready' ? leagueState.league : null

  useEffect(() => {
    if (!repository && !league) return
    let alive = true
    let off: (() => void) | undefined
    let opened: CheerRepository | undefined
    ;(async () => {
      const seeds = league ? demoCheerSeeds({ hitters: league.hitters.map((p) => p.raw), pitchers: league.pitchers.map((p) => p.raw) }) : undefined
      const repo = repository ?? (opened = await openCheerRepository({ seeds }))
      if (!alive) return
      off = repo.subscribe((snapshot) => alive && setState((s) => (s.status === 'ready' ? { ...s, snapshot } : s)))
      const [user, snapshot] = await Promise.all([repo.currentUser(), repo.snapshot()])
      if (alive) setState({ status: 'ready', repo, user, snapshot })
    })().catch((e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
      off?.()
      opened?.close?.()
    }
  }, [repository, league])

  return <CheerContext.Provider value={state}>{children}</CheerContext.Provider>
}
