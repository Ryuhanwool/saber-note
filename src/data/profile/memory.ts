// 메모리 프로필 저장소: 새로고침하면 사라진다 (브라우저 저장소를 쓸 수 없을 때, 테스트)
import { requireUser } from '../community/shared'
import type { ProfileRepository } from '../source'
import type { CommunityUser, ProfileSnapshot, SeenMarks } from '../types'
import { profileKey } from './shared'

export type MemoryProfileStore = Map<string, { image: Blob | null; seen: SeenMarks }>

export function createMemoryProfile(opts: { user: CommunityUser | null; store?: MemoryProfileStore }): ProfileRepository {
  const store: MemoryProfileStore = opts.store ?? new Map()
  const key = profileKey(opts.user)
  const listeners = new Set<(s: ProfileSnapshot) => void>()
  const get = () => store.get(key) ?? { image: null, seen: {} }
  const snapshot = async (): Promise<ProfileSnapshot> => {
    const r = get()
    return { image: opts.user ? r.image : null, seen: { ...r.seen } }
  }
  const notify = async () => {
    const s = await snapshot()
    listeners.forEach((l) => l(s))
  }
  return {
    storage: 'memory',
    snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async setImage(image) {
      requireUser(opts.user)
      store.set(key, { ...get(), image })
      await notify()
    },
    async markSeen(kind, at) {
      const r = get()
      store.set(key, { ...r, seen: { ...r.seen, [kind]: Math.max(at, r.seen[kind] ?? 0) } })
      await notify()
    },
    async resetDemoData() {
      store.clear()
      await notify()
    },
  }
}
