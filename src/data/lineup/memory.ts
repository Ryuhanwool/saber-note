// 메모리 라인업 저장소: 새로고침하면 사라진다 (브라우저 저장소를 쓸 수 없을 때, 테스트)
import { requireUser } from '../community/shared'
import type { LineupRepository } from '../source'
import type { CommunityUser, SavedLineup } from '../types'
import { toSaved } from './shared'

export type MemoryLineupStore = Map<string, SavedLineup>

export function createMemoryLineup(opts: { user: CommunityUser | null; store?: MemoryLineupStore; now?: () => number }): LineupRepository {
  const store = opts.store ?? new Map<string, SavedLineup>()
  const now = opts.now ?? Date.now
  const listeners = new Set<(l: SavedLineup | null) => void>()
  const mine = async () => (opts.user ? (store.get(opts.user.id) ?? null) : null)
  const notify = async () => {
    const m = await mine()
    listeners.forEach((l) => l(m))
  }
  return {
    storage: 'memory',
    mine,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async save(lineup) {
      const user = requireUser(opts.user)
      const saved = toSaved(user.id, lineup, now())
      store.set(user.id, saved)
      await notify()
      return saved
    },
    async resetDemoData() {
      store.clear()
      await notify()
    },
  }
}
