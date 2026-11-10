// 브라우저 응원 저장소: 응원 메시지와 「응원하기」 기록을 IndexedDB에 저장한다. 새로고침해도 남고, 이 브라우저에서만 보인다.
import { assertAuthor, newId, reportedBy, requireUser, type RepoUser } from '../community/shared'
import type { CheerRepository } from '../source'
import type { CheerEvent, CheerMessage, CheerSnapshot, CommunityUser } from '../types'
import { EMPTY_CHEER_SEEDS, seedToCheer, seedToMessage, type CheerSeeds } from './seed'
import { assertNotCheeredToday, findMessage, newestMessagesFirst } from './shared'

export const CHEER_DB_NAME = 'saber-note-cheer'
const DB_VERSION = 1
const CHANNEL = 'saber-note-cheer'

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
    const r = factory.open(CHEER_DB_NAME, DB_VERSION)
    r.onupgradeneeded = () => {
      const db = r.result
      db.createObjectStore('messages', { keyPath: 'id' })
      db.createObjectStore('cheers', { keyPath: 'id' })
      db.createObjectStore('meta', { keyPath: 'key' })
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.onblocked = () => reject(new Error('다른 탭이 저장소를 쓰고 있어 열지 못했습니다.'))
  })
}

/**
 * 예시 응원을 저장한다. 이미 있으면 신고는 두고 시각만 지금 기준으로 다시 맞춘다.
 * fresh면 메시지·응원 기록을 모두 비운 뒤 처음 상태로 넣는다 (시연 데이터 초기화. 이 브라우저의 사용자 id는 남긴다).
 */
async function applySeeds(db: IDBDatabase, seeds: CheerSeeds, now: number, fresh = false) {
  const tx = db.transaction(['messages', 'cheers'], 'readwrite')
  const messages = tx.objectStore('messages')
  const cheers = tx.objectStore('cheers')
  if (fresh) {
    messages.clear()
    cheers.clear()
  }
  if (!fresh) {
    // 예전 예시의 가상 시청자 응원(지금 예시에 없는 것)은 지운다: 예시 선수를 고르는 방식이 바뀌어도 응원 수가 남지 않게
    const keep = new Set(seeds.cheers.map((c) => c.id))
    for (const c of await request(cheers.getAll() as IDBRequest<CheerEvent[]>)) {
      if (c.id.startsWith('demo-cheer-') && !keep.has(c.id)) cheers.delete(c.id)
    }
  }
  for (const c of seeds.cheers) cheers.put(seedToCheer(c, now))
  for (const s of seeds.messages) {
    const existing = fresh ? undefined : await request(messages.get(s.id) as IDBRequest<CheerMessage | undefined>)
    messages.put(seedToMessage(s, now, existing))
  }
  await finished(tx)
}

export type BrowserCheerOptions = {
  /** 기본은 브라우저의 indexedDB (테스트에서는 가짜 구현을 넣는다) */
  indexedDB?: IDBFactory
  /** 기본은 이 브라우저에 한 번 만들어 저장해 둔 로컬 사용자 */
  user?: RepoUser
  seeds?: CheerSeeds
  /** 기본은 Date.now (테스트에서 날짜를 바꿀 때) */
  now?: () => number
}

export function createBrowserCheer(opts: BrowserCheerOptions = {}): CheerRepository & { close(): void } {
  const factory = opts.indexedDB ?? globalThis.indexedDB
  const seeds = opts.seeds ?? EMPTY_CHEER_SEEDS
  const now = opts.now ?? Date.now
  let dbPromise: Promise<IDBDatabase> | null = null
  const db = () =>
    (dbPromise ??= openDb(factory).then(async (d) => {
      await applySeeds(d, seeds, now())
      return d
    }))
  const listeners = new Set<(s: CheerSnapshot) => void>()
  let userPromise: Promise<CommunityUser | null> | null = null

  // 다른 탭에서 바뀌면 다시 읽는다
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null
  if (channel) channel.onmessage = () => void notify(false).catch(() => {})

  async function snapshot(): Promise<CheerSnapshot> {
    const tx = (await db()).transaction(['messages', 'cheers'], 'readonly')
    const [messages, cheers] = await Promise.all([
      request(tx.objectStore('messages').getAll() as IDBRequest<CheerMessage[]>),
      request(tx.objectStore('cheers').getAll() as IDBRequest<CheerEvent[]>),
    ])
    return { messages: newestMessagesFirst(messages), cheers }
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

  async function getMessage(id: string): Promise<CheerMessage> {
    const tx = (await db()).transaction('messages', 'readonly')
    const m = await request(tx.objectStore('messages').get(id) as IDBRequest<CheerMessage | undefined>)
    return findMessage(m ? [m] : [], id)
  }

  async function write(store: 'messages' | 'cheers', action: (s: IDBObjectStore) => void) {
    const tx = (await db()).transaction(store, 'readwrite')
    action(tx.objectStore(store))
    await finished(tx)
    await notify()
  }

  return {
    storage: 'browser',
    currentUser: user,
    snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async postMessage(input) {
      const me = requireUser(await user())
      const m: CheerMessage = { id: newId(), playerId: input.playerId, authorId: me.id, authorName: me.name, text: input.text, createdAt: now(), reports: [], caution: input.caution }
      await write('messages', (s) => s.put(m))
      return m
    },
    async cheer(playerId) {
      const me = requireUser(await user())
      const t = now()
      // 확인과 저장을 한 트랜잭션에서 해서, 빠르게 두 번 눌러도 한 번만 저장된다
      const tx = (await db()).transaction('cheers', 'readwrite')
      const store = tx.objectStore('cheers')
      const all = await request(store.getAll() as IDBRequest<CheerEvent[]>)
      try {
        assertNotCheeredToday(all, playerId, me.id, t)
      } catch (e) {
        tx.abort()
        throw e
      }
      store.put({ id: newId(), playerId, userId: me.id, createdAt: t } satisfies CheerEvent)
      await finished(tx)
      await notify()
    },
    async report(id) {
      const [me, m] = await Promise.all([user().then(requireUser), getMessage(id)])
      await write('messages', (s) => s.put({ ...m, reports: reportedBy(m, me.id) }))
    },
    async remove(id) {
      const [me, m] = await Promise.all([user().then(requireUser), getMessage(id)])
      assertAuthor(m, me.id)
      await write('messages', (s) => s.delete(id))
    },
    async resetDemoData() {
      await applySeeds(await db(), seeds, now(), true)
      await notify()
    },
    close() {
      channel?.close()
      void dbPromise?.then((d) => d.close())
    },
  }
}
