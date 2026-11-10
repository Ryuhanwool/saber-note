// 브라우저 라인업 저장소: 계정마다 라인업 1개를 IndexedDB에 저장한다. 새로고침해도 남고, 이 브라우저에서만 보인다.
import { requireUser } from '../community/shared'
import type { LineupRepository } from '../source'
import type { CommunityUser, SavedLineup } from '../types'
import { toSaved } from './shared'

export const LINEUP_DB_NAME = 'saber-note-lineup'
const DB_VERSION = 1
const CHANNEL = 'saber-note-lineup'

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

function openDb(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = factory.open(LINEUP_DB_NAME, DB_VERSION)
    r.onupgradeneeded = () => {
      r.result.createObjectStore('lineups', { keyPath: 'accountId' })
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.onblocked = () => reject(new Error('다른 탭이 저장소를 쓰고 있어 열지 못했습니다.'))
  })
}

export type BrowserLineupOptions = {
  /** 기본은 브라우저의 indexedDB (테스트에서는 가짜 구현을 넣는다) */
  indexedDB?: IDBFactory
  /** 로그인한 계정. 로그아웃이면 null (읽기만) */
  user: CommunityUser | null
  now?: () => number
}

export function createBrowserLineup(opts: BrowserLineupOptions): LineupRepository & { close(): void } {
  const factory = opts.indexedDB ?? globalThis.indexedDB
  const now = opts.now ?? Date.now
  let dbPromise: Promise<IDBDatabase> | null = null
  const db = () => (dbPromise ??= openDb(factory))
  const listeners = new Set<(l: SavedLineup | null) => void>()
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null
  if (channel) channel.onmessage = () => void notify(false).catch(() => {})

  async function mine(): Promise<SavedLineup | null> {
    if (!opts.user) {
      await db() // 저장소는 열어 본다 (열 수 없으면 registry가 메모리로 바꾼다)
      return null
    }
    const tx = (await db()).transaction('lineups', 'readonly')
    return (await request(tx.objectStore('lineups').get(opts.user.id) as IDBRequest<SavedLineup | undefined>)) ?? null
  }

  async function notify(broadcast = true) {
    const m = await mine()
    listeners.forEach((l) => l(m))
    if (broadcast) channel?.postMessage('changed')
  }

  return {
    storage: 'browser',
    mine,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async save(lineup) {
      const user = requireUser(opts.user)
      const saved = toSaved(user.id, lineup, now())
      const tx = (await db()).transaction('lineups', 'readwrite')
      tx.objectStore('lineups').put(saved)
      await finished(tx)
      await notify()
      return saved
    },
    async resetDemoData() {
      const tx = (await db()).transaction('lineups', 'readwrite')
      tx.objectStore('lineups').clear()
      await finished(tx)
      await notify()
    },
    close() {
      channel?.close()
      void dbPromise?.then((d) => d.close()).catch(() => {})
    },
  }
}
