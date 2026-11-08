// 브라우저 마켓 저장소: 판매글과 사진, 장바구니를 IndexedDB에 저장한다. 새로고침해도 남고, 이 브라우저에서만 보인다.
import { assertAuthor, newId, reportedBy, requireUser, type RepoUser } from '../community/shared'
import { StorageFullError, type MarketRepository } from '../source'
import type { CartLine, CommunityUser, MarketListing, MarketSnapshot } from '../types'
import { findListing, newestListingsFirst } from './memory'
import { seedToListing, type SeedListing } from './seed'

export const MARKET_DB_NAME = 'saber-note-market'
const DB_VERSION = 1
const CHANNEL = 'saber-note-market'

type MediaRecord = { id: string; type: string; data: ArrayBuffer }
type MetaRecord = { key: string; value: unknown }

const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })

const finished = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('저장을 취소했습니다.'))
  })

const storageError = (e: unknown) => (e instanceof DOMException && e.name === 'QuotaExceededError' ? new StorageFullError() : e)

function openDb(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = factory.open(MARKET_DB_NAME, DB_VERSION)
    r.onupgradeneeded = () => {
      const db = r.result
      db.createObjectStore('listings', { keyPath: 'id' })
      db.createObjectStore('media', { keyPath: 'id' })
      db.createObjectStore('meta', { keyPath: 'key' })
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.onblocked = () => reject(new Error('다른 탭이 저장소를 쓰고 있어 열지 못했습니다.'))
  })
}

/**
 * 예시 판매글과 사진을 저장한다. 이미 있으면 신고는 두고 시각만 다시 맞춘다.
 * fresh면 판매글·사진·장바구니를 모두 비운 뒤 처음 상태로 넣는다 (시연 데이터 초기화. 사용자 id는 남긴다).
 */
async function applySeeds(db: IDBDatabase, seeds: SeedListing[], now: number, fresh = false) {
  const files = await Promise.all(seeds.flatMap((s) => s.media).map(async (m) => ({ id: m.id, type: m.type, data: await m.blob.arrayBuffer() })))
  const tx = db.transaction(['listings', 'media', 'meta'], 'readwrite')
  const listings = tx.objectStore('listings')
  if (fresh) {
    listings.clear()
    tx.objectStore('media').clear()
    tx.objectStore('meta').delete('cart')
  }
  for (const f of files) tx.objectStore('media').put(f satisfies MediaRecord)
  for (const s of seeds) {
    const existing = fresh ? undefined : await request(listings.get(s.id) as IDBRequest<MarketListing | undefined>)
    listings.put(seedToListing(s, now, existing))
  }
  await finished(tx)
}

export type BrowserMarketOptions = {
  indexedDB?: IDBFactory
  user?: RepoUser
  seeds?: SeedListing[]
  now?: () => number
}

export function createBrowserMarket(opts: BrowserMarketOptions = {}): MarketRepository & { readMedia(id: string): Promise<Blob | null>; close(): void } {
  const factory = opts.indexedDB ?? globalThis.indexedDB
  const seeds = opts.seeds ?? []
  const now = opts.now ?? Date.now
  let dbPromise: Promise<IDBDatabase> | null = null
  const db = () =>
    (dbPromise ??= openDb(factory).then(async (d) => {
      await applySeeds(d, seeds, now())
      return d
    }))
  const listeners = new Set<(s: MarketSnapshot) => void>()
  const urls = new Map<string, string>()
  let userPromise: Promise<CommunityUser | null> | null = null

  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null
  if (channel) channel.onmessage = () => void notify(false).catch(() => {})

  async function snapshot(): Promise<MarketSnapshot> {
    const tx = (await db()).transaction(['listings', 'meta'], 'readonly')
    const [listings, cart] = await Promise.all([
      request(tx.objectStore('listings').getAll() as IDBRequest<MarketListing[]>),
      request(tx.objectStore('meta').get('cart') as IDBRequest<MetaRecord | undefined>),
    ])
    return { listings: newestListingsFirst(listings), cart: (cart?.value as CartLine[] | undefined) ?? [] }
  }

  async function notify(broadcast = true) {
    const s = await snapshot()
    listeners.forEach((l) => l(s))
    if (broadcast) channel?.postMessage('changed')
  }

  async function loadUser(): Promise<CommunityUser | null> {
    if (opts.user !== undefined) return opts.user
    const tx = (await db()).transaction('meta', 'readwrite')
    const store = tx.objectStore('meta')
    const saved = await request(store.get('user') as IDBRequest<MetaRecord | undefined>)
    const user = (saved?.value as CommunityUser | undefined) ?? { id: `local:${newId()}`, name: '나' }
    if (!saved) store.put({ key: 'user', value: user } satisfies MetaRecord)
    await finished(tx)
    return user
  }
  const user = () => (userPromise ??= loadUser())

  async function getListing(id: string): Promise<MarketListing> {
    const tx = (await db()).transaction('listings', 'readonly')
    const l = await request(tx.objectStore('listings').get(id) as IDBRequest<MarketListing | undefined>)
    return findListing(l ? [l] : [], id)
  }

  async function readMedia(id: string): Promise<Blob | null> {
    const tx = (await db()).transaction('media', 'readonly')
    const m = await request(tx.objectStore('media').get(id) as IDBRequest<MediaRecord | undefined>)
    return m ? new Blob([m.data], { type: m.type }) : null
  }

  return {
    storage: 'browser',
    currentUser: user,
    snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async createListing(input) {
      const me = requireUser(await user())
      const { files: inputFiles, ...rest } = input
      // 파일 읽기(await)는 트랜잭션 전에 끝낸다
      const files = await Promise.all(inputFiles.map(async (f) => ({ id: newId(), kind: f.kind, name: f.name, type: f.blob.type, data: await f.blob.arrayBuffer() })))
      const l: MarketListing = {
        ...rest, id: newId(), authorId: me.id, sellerName: me.name,
        media: files.map(({ id, kind, type, name }) => ({ id, kind, type, name })), createdAt: now(), reports: [],
      }
      try {
        const tx = (await db()).transaction(['listings', 'media'], 'readwrite')
        for (const f of files) tx.objectStore('media').put({ id: f.id, type: f.type, data: f.data } satisfies MediaRecord)
        tx.objectStore('listings').put(l)
        await finished(tx)
      } catch (e) {
        throw storageError(e)
      }
      await notify()
      return l
    },
    async report(id) {
      const [me, l] = await Promise.all([user().then(requireUser), getListing(id)])
      const tx = (await db()).transaction('listings', 'readwrite')
      tx.objectStore('listings').put({ ...l, reports: reportedBy(l, me.id) })
      await finished(tx)
      await notify()
    },
    async remove(id) {
      const [me, l] = await Promise.all([user().then(requireUser), getListing(id)])
      assertAuthor(l, me.id)
      const tx = (await db()).transaction(['listings', 'media'], 'readwrite')
      tx.objectStore('listings').delete(id)
      for (const m of l.media) tx.objectStore('media').delete(m.id)
      await finished(tx)
      for (const m of l.media) {
        const url = urls.get(m.id)
        if (url) URL.revokeObjectURL(url)
        urls.delete(m.id)
      }
      await notify()
    },
    async saveCart(cart) {
      const tx = (await db()).transaction('meta', 'readwrite')
      tx.objectStore('meta').put({ key: 'cart', value: cart } satisfies MetaRecord)
      await finished(tx)
      await notify()
    },
    async mediaUrl(ref) {
      if (urls.has(ref.id)) return urls.get(ref.id)!
      const blob = await readMedia(ref.id)
      if (!blob || typeof URL.createObjectURL !== 'function') return null
      const url = URL.createObjectURL(blob)
      urls.set(ref.id, url)
      return url
    },
    readMedia,
    async resetDemoData() {
      await applySeeds(await db(), seeds, now(), true)
      urls.forEach((u) => URL.revokeObjectURL(u))
      urls.clear()
      await notify()
    },
    close() {
      channel?.close()
      urls.forEach((u) => URL.revokeObjectURL(u))
      urls.clear()
      void dbPromise?.then((d) => d.close())
    },
  }
}
