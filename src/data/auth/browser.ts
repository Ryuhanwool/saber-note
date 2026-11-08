// 브라우저 계정 저장소: 계정(비밀번호는 해시만)과 로그인 상태를 IndexedDB에 저장한다. 새로고침해도 로그인이 남는다.
import { newId } from '../community/shared'
import { NicknameTakenError, WrongCredentialsError, type AuthRepository } from '../source'
import { DEMO_ACCOUNT_ID, type Account } from '../types'
import type { AuthOptions } from './memory'
import { availableSubtle, demoRecord, newRecord, nicknameKey, passwordMatches, toAccount, type AccountRecord } from './shared'

export const AUTH_DB_NAME = 'saber-note-auth'
const DB_VERSION = 1
const CHANNEL = 'saber-note-auth'

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

function openDb(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = factory.open(AUTH_DB_NAME, DB_VERSION)
    r.onupgradeneeded = () => {
      const db = r.result
      db.createObjectStore('accounts', { keyPath: 'id' })
      db.createObjectStore('meta', { keyPath: 'key' })
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.onblocked = () => reject(new Error('다른 탭이 저장소를 쓰고 있어 열지 못했습니다.'))
  })
}

export function createBrowserAuth(opts: AuthOptions & { indexedDB?: IDBFactory } = {}): AuthRepository & { close(): void } {
  const factory = opts.indexedDB ?? globalThis.indexedDB
  const subtle = opts.subtle === undefined ? availableSubtle() : opts.subtle
  const now = opts.now ?? Date.now
  let dbPromise: Promise<IDBDatabase> | null = null
  const db = () =>
    (dbPromise ??= openDb(factory).then(async (d) => {
      // 데모 계정은 늘 있다
      const tx = d.transaction('accounts', 'readwrite')
      tx.objectStore('accounts').put(demoRecord())
      await finished(tx)
      return d
    }))
  const listeners = new Set<(a: Account | null) => void>()

  // 다른 탭에서 로그인·로그아웃하면 따라간다
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null
  if (channel) channel.onmessage = () => void notify(false).catch(() => {})

  async function records(): Promise<AccountRecord[]> {
    const tx = (await db()).transaction('accounts', 'readonly')
    return request(tx.objectStore('accounts').getAll() as IDBRequest<AccountRecord[]>)
  }

  async function current(): Promise<Account | null> {
    const tx = (await db()).transaction(['accounts', 'meta'], 'readonly')
    const s = await request(tx.objectStore('meta').get('session') as IDBRequest<MetaRecord | undefined>)
    const id = (s?.value as string | undefined) ?? null
    if (!id) return null
    const r = await request(tx.objectStore('accounts').get(id) as IDBRequest<AccountRecord | undefined>)
    return r ? toAccount(r) : null
  }

  async function notify(broadcast = true) {
    const a = await current()
    listeners.forEach((l) => l(a))
    if (broadcast) channel?.postMessage('changed')
    return a
  }

  async function setSession(id: string | null): Promise<Account | null> {
    const tx = (await db()).transaction('meta', 'readwrite')
    if (id) tx.objectStore('meta').put({ key: 'session', value: id } satisfies MetaRecord)
    else tx.objectStore('meta').delete('session')
    await finished(tx)
    return notify()
  }

  return {
    storage: 'browser',
    cryptoAvailable: subtle !== null,
    current,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async nicknames() {
      return (await records()).map((r) => r.nickname)
    },
    async signUp(input) {
      // 해시(await)는 트랜잭션 전에 끝낸다
      const r = await newRecord(subtle, `acct:${newId()}`, input.nickname, input.password, input.team, now(), opts.iterations)
      const tx = (await db()).transaction('accounts', 'readwrite')
      const store = tx.objectStore('accounts')
      const all = await request(store.getAll() as IDBRequest<AccountRecord[]>)
      if (all.some((x) => x.key === r.key)) {
        tx.abort()
        throw new NicknameTakenError()
      }
      store.put(r)
      await finished(tx)
      return (await setSession(r.id))!
    },
    async signIn(nickname, password) {
      const r = (await records()).find((x) => x.key === nicknameKey(nickname))
      if (!r || !(await passwordMatches(subtle, r, password))) throw new WrongCredentialsError()
      return (await setSession(r.id))!
    },
    async signInDemo() {
      await db()
      return (await setSession(DEMO_ACCOUNT_ID))!
    },
    async signOut() {
      await setSession(null)
    },
    async resetDemoData({ accounts }) {
      if (!accounts) return
      const tx = (await db()).transaction(['accounts', 'meta'], 'readwrite')
      tx.objectStore('accounts').clear()
      tx.objectStore('accounts').put(demoRecord())
      tx.objectStore('meta').delete('session')
      await finished(tx)
      await notify()
    },
    close() {
      channel?.close()
      void dbPromise?.then((d) => d.close())
    },
  }
}
