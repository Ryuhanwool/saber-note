// 메모리 마켓 저장소: 새로고침하면 사라진다. IndexedDB를 쓸 수 없는 브라우저의 대체와 테스트용.
import { assertAuthor, newId, reportedBy, requireUser, type RepoUser } from '../community/shared'
import type { MarketRepository } from '../source'
import type { CartLine, CommunityUser, MarketListing, MarketSnapshot, MediaRef } from '../types'
import { seedToListing, type SeedListing } from './seed'

export const newestListingsFirst = (ls: readonly MarketListing[]) => [...ls].sort((a, b) => b.createdAt - a.createdAt)

export function findListing(ls: readonly MarketListing[], id: string): MarketListing {
  const l = ls.find((x) => x.id === id)
  if (!l) throw new Error('판매글을 찾을 수 없습니다.')
  return l
}

export function createMemoryMarket(opts: { user?: RepoUser; seeds?: SeedListing[]; now?: () => number } = {}): MarketRepository {
  const user: CommunityUser | null = opts.user === undefined ? { id: `local:${newId()}`, name: '나' } : opts.user
  const seeds = opts.seeds ?? []
  const now = opts.now ?? Date.now
  let listings: MarketListing[] = []
  let cart: CartLine[] = []
  let blobs = new Map<string, Blob>()
  const urls = new Map<string, string>()
  const fill = () => {
    const t = now()
    listings = seeds.map((s) => seedToListing(s, t))
    blobs = new Map(seeds.flatMap((s) => s.media.map((m) => [m.id, m.blob] as const)))
    cart = []
  }
  fill()
  const listeners = new Set<(s: MarketSnapshot) => void>()
  const snap = (): MarketSnapshot => ({ listings: newestListingsFirst(listings), cart: [...cart] })
  const emit = () => listeners.forEach((l) => l(snap()))
  const forget = (refs: readonly MediaRef[]) => {
    for (const m of refs) {
      blobs.delete(m.id)
      const url = urls.get(m.id)
      if (url) URL.revokeObjectURL(url)
      urls.delete(m.id)
    }
  }

  return {
    storage: 'memory',
    async currentUser() {
      return user
    },
    async snapshot() {
      return snap()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async createListing(input) {
      const me = requireUser(user)
      const { files, ...rest } = input
      const media: MediaRef[] = files.map((f) => {
        const id = newId()
        blobs.set(id, f.blob)
        return { id, kind: f.kind, type: f.blob.type, name: f.name }
      })
      const l: MarketListing = { ...rest, id: newId(), authorId: me.id, sellerName: me.name, media, createdAt: now(), reports: [] }
      listings = [l, ...listings]
      emit()
      return l
    },
    async report(id) {
      const l = findListing(listings, id)
      listings = listings.map((x) => (x.id === id ? { ...l, reports: reportedBy(l, requireUser(user).id) } : x))
      emit()
    },
    async remove(id) {
      const l = findListing(listings, id)
      assertAuthor(l, requireUser(user).id)
      forget(l.media)
      listings = listings.filter((x) => x.id !== id)
      emit()
    },
    async saveCart(next) {
      cart = [...next]
      emit()
    },
    async mediaUrl(ref) {
      const blob = blobs.get(ref.id)
      if (!blob || typeof URL.createObjectURL !== 'function') return null
      if (!urls.has(ref.id)) urls.set(ref.id, URL.createObjectURL(blob))
      return urls.get(ref.id)!
    },
    async resetDemoData() {
      urls.forEach((u) => URL.revokeObjectURL(u))
      urls.clear()
      fill()
      emit()
    },
  }
}
