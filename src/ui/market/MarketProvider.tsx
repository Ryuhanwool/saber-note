import { useEffect, useState, type ReactNode } from 'react'
import { demoMarketSeeds, openMarketRepository } from '../../data/registry'
import type { MarketRepository } from '../../data/source'
import { useLeagueState } from '../shared/LeagueContext'
import { MarketContext, type MarketState } from './MarketContext'

type Props = {
  /** registry 대신 쓸 저장소 (테스트용). 없으면 리그 기록으로 만든 예시 판매글과 함께 브라우저 저장소를 연다 */
  repository?: MarketRepository
  children: ReactNode
}

/** 마켓 저장소를 열고 상태(판매글, 장바구니)를 구독해 하위 화면(마켓, 선수 카드, 응원방)에 넘긴다 */
export default function MarketProvider({ repository, children }: Props) {
  const [state, setState] = useState<MarketState>({ status: 'loading' })
  const leagueState = useLeagueState()
  const league = leagueState.status === 'ready' ? leagueState.league : null

  useEffect(() => {
    if (!repository && !league) return
    let alive = true
    let off: (() => void) | undefined
    let opened: MarketRepository | undefined
    ;(async () => {
      const seeds = league ? demoMarketSeeds({ hitters: league.hitters.map((p) => p.raw), pitchers: league.pitchers.map((p) => p.raw) }) : []
      const repo = repository ?? (opened = await openMarketRepository({ seeds }))
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

  return <MarketContext.Provider value={state}>{children}</MarketContext.Provider>
}
