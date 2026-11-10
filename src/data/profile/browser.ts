// 브라우저 프로필 저장소: 계정마다 프로필 사진과 「마지막으로 본 때」를 IndexedDB에 저장한다. 새로고침해도 남고, 이 브라우저에서만 보인다.
import { requireUser } from '../community/shared'
import { StorageFullError, type ProfileRepository } from '../source'
import type { CommunityUser, ProfileSnapshot, SeenMarks } from '../types'
import { profileKey } from './shared'

export const PROFILE_DB_NAME = 'saber-note-profile'
const DB_VERSION = 1
const CHANNEL = 'saber-note-profile'

type ProfileRecord = { key: string; image?: { type: string; data: ArrayBuffer }; seen?: SeenMarks }

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
    const r = factory.open(PROFILE_DB_NAME, DB_VERSION)
    r.onupgradeneeded = () => {
      r.result.createObjectStore('profiles', { keyPath: 'key' })
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.onblocked = () => reject(new Error('다른 탭이 저장소를 쓰고 있어 열지 못했습니다.'))
  })
}

export type BrowserProfileOptions = {
  /** 기본은 브라우저의 indexedDB (테스트에서는 가짜 구현을 넣는다) */
  indexedDB?: IDBFactory
  /** 로그인한 계정. 로그아웃이면 null (사진은 못 바꾸고, 마지막으로 본 때는 손님 기록) */
  user: CommunityUser | null
}

export function createBrowserProfile(opts: BrowserProfileOptions): ProfileRepository & { close(): void } {
  const factory = opts.indexedDB ?? globalThis.indexedDB
  const key = profileKey(opts.user)
  let dbPromise: Promise<IDBDatabase> | null = null
  const db = () => (dbPromise ??= openDb(factory))
  const listeners = new Set<(s: ProfileSnapshot) => void>()
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null
  if (channel) channel.onmessage = () => void notify(false).catch(() => {})

  async function read(): Promise<ProfileRecord> {
    const tx = (await db()).transaction('profiles', 'readonly')
    return (await request(tx.objectStore('profiles').get(key) as IDBRequest<ProfileRecord | undefined>)) ?? { key }
  }

  async function snapshot(): Promise<ProfileSnapshot> {
    const rec = await read()
    return {
      // 로그아웃 상태에는 사진이 없다 (손님 기록에는 사진을 두지 않는다)
      image: opts.user && rec.image ? new Blob([rec.image.data], { type: rec.image.type }) : null,
      seen: { ...rec.seen },
    }
  }

  async function write(change: (r: ProfileRecord) => ProfileRecord) {
    const rec = change(await read())
    try {
      const tx = (await db()).transaction('profiles', 'readwrite')
      tx.objectStore('profiles').put(rec)
      await finished(tx)
    } catch (e) {
      throw e instanceof DOMException && e.name === 'QuotaExceededError' ? new StorageFullError() : e
    }
    await notify()
  }

  async function notify(broadcast = true) {
    const s = await snapshot()
    listeners.forEach((l) => l(s))
    if (broadcast) channel?.postMessage('changed')
  }

  return {
    storage: 'browser',
    snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async setImage(image) {
      requireUser(opts.user)
      // 파일 읽기(await)는 트랜잭션 전에 끝낸다
      const data = image ? { type: image.type, data: await image.arrayBuffer() } : undefined
      await write((r) => ({ ...r, image: data }))
    },
    async markSeen(kind, at) {
      await write((r) => ({ ...r, seen: { ...r.seen, [kind]: Math.max(at, r.seen?.[kind] ?? 0) } }))
    },
    async resetDemoData() {
      const tx = (await db()).transaction('profiles', 'readwrite')
      tx.objectStore('profiles').clear()
      await finished(tx)
      await notify()
    },
    close() {
      channel?.close()
      void dbPromise?.then((d) => d.close()).catch(() => {})
    },
  }
}
