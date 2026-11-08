// 브라우저 저장소: 글과 사진·영상 파일을 IndexedDB에 저장한다. 새로고침해도 남고, 이 브라우저에서만 보인다.
// 파일은 Blob 대신 ArrayBuffer + 형식으로 저장한다 (브라우저·테스트 환경 모두에서 확실히 복제되도록).
import { StorageFullError, type CommunityRepository } from '../source'
import type { CommunityPost, CommunityUser, MediaRef } from '../types'
import { seedToPost, type SeedPost } from './seed'
import { assertAuthor, newestFirst, newId, normalizePost, reportedBy, requireUser, toggledLikes, type RepoUser } from './shared'

export const DB_NAME = 'saber-note-community'
const DB_VERSION = 1
const CHANNEL = 'saber-note-community'

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

/** 저장 공간 부족 오류를 알아볼 수 있게 바꾼다 */
function storageError(e: unknown): unknown {
  return e instanceof DOMException && e.name === 'QuotaExceededError' ? new StorageFullError() : e
}

function openDb(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = factory.open(DB_NAME, DB_VERSION)
    r.onupgradeneeded = () => {
      const db = r.result
      db.createObjectStore('posts', { keyPath: 'id' })
      db.createObjectStore('media', { keyPath: 'id' })
      db.createObjectStore('meta', { keyPath: 'key' })
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.onblocked = () => reject(new Error('다른 탭이 저장소를 쓰고 있어 열지 못했습니다.'))
  })
}

export type BrowserCommunityOptions = {
  /** 기본은 브라우저의 indexedDB (테스트에서는 가짜 구현을 넣는다) */
  indexedDB?: IDBFactory
  /** 기본은 이 브라우저에 한 번 만들어 저장해 둔 로컬 사용자 (테스트에서 여러 사용자를 흉내 낼 때 넣는다) */
  user?: RepoUser
  /** 시연용 예시 글. 열 때마다 저장하고(좋아요·신고는 유지) 작성 시각을 지금 기준으로 다시 맞춘다 */
  seeds?: SeedPost[]
}

/**
 * 예시 글과 그 파일을 저장한다. 이미 있으면 좋아요·신고는 두고 작성 시각만 다시 맞춘다.
 * fresh면 저장소를 모두 비운 뒤 예시 글을 처음 상태로 넣는다 (시연 데이터 초기화).
 */
async function applySeeds(db: IDBDatabase, seeds: SeedPost[], fresh = false) {
  // 파일 읽기(await)는 트랜잭션 전에 끝낸다
  const files = await Promise.all(seeds.flatMap((s) => s.media).map(async (m) => ({ id: m.id, type: m.type, data: await m.blob.arrayBuffer() })))
  const now = Date.now()
  const tx = db.transaction(['posts', 'media'], 'readwrite')
  const posts = tx.objectStore('posts')
  if (fresh) {
    posts.clear()
    tx.objectStore('media').clear()
  }
  for (const f of files) tx.objectStore('media').put(f satisfies MediaRecord)
  for (const seed of seeds) {
    const existing = fresh ? undefined : await request(posts.get(seed.id) as IDBRequest<CommunityPost | undefined>)
    posts.put(seedToPost(seed, now, existing))
  }
  await finished(tx)
}

export function createBrowserCommunity(opts: BrowserCommunityOptions = {}): CommunityRepository & {
  /** 저장된 파일 내용 (테스트·확인용) */
  readMedia(id: string): Promise<Blob | null>
  close(): void
} {
  const factory = opts.indexedDB ?? globalThis.indexedDB
  let dbPromise: Promise<IDBDatabase> | null = null
  const db = () =>
    (dbPromise ??= openDb(factory).then(async (d) => {
      if (opts.seeds?.length) await applySeeds(d, opts.seeds)
      return d
    }))
  const listeners = new Set<(p: CommunityPost[]) => void>()
  const urls = new Map<string, string>()
  let userPromise: Promise<CommunityUser | null> | null = null

  // 다른 탭에서 글이 바뀌면 다시 읽는다
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null
  if (channel) channel.onmessage = () => void notify(false).catch(() => {}) // 닫힌 뒤 도착한 알림은 무시

  async function all(): Promise<CommunityPost[]> {
    const tx = (await db()).transaction('posts', 'readonly')
    return newestFirst((await request(tx.objectStore('posts').getAll() as IDBRequest<CommunityPost[]>)).map(normalizePost))
  }

  async function notify(broadcast = true) {
    const posts = await all()
    listeners.forEach((l) => l(posts))
    if (broadcast) channel?.postMessage('changed')
  }

  async function getPost(id: string): Promise<CommunityPost> {
    const tx = (await db()).transaction('posts', 'readonly')
    const p = await request(tx.objectStore('posts').get(id) as IDBRequest<CommunityPost | undefined>)
    if (!p) throw new Error('글을 찾을 수 없습니다.')
    return normalizePost(p)
  }

  async function putPost(p: CommunityPost) {
    const tx = (await db()).transaction('posts', 'readwrite')
    tx.objectStore('posts').put(p)
    await finished(tx)
    await notify()
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

  async function readMedia(id: string): Promise<Blob | null> {
    const tx = (await db()).transaction('media', 'readonly')
    const m = await request(tx.objectStore('media').get(id) as IDBRequest<MediaRecord | undefined>)
    return m ? new Blob([m.data], { type: m.type }) : null
  }

  return {
    storage: 'browser',

    currentUser: user,
    list: all,

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    async create(input) {
      const me = requireUser(await user())
      // 파일 읽기(await)를 트랜잭션 전에 끝낸다: IndexedDB 트랜잭션은 기다리는 동안 자동으로 끝나 버린다
      const files = await Promise.all(
        input.files.map(async (f) => ({ id: newId(), kind: f.kind, name: f.name, type: f.blob.type, data: await f.blob.arrayBuffer() })),
      )
      const media: MediaRef[] = files.map(({ id, kind, type, name }) => ({ id, kind, type, name }))
      const post: CommunityPost = {
        id: newId(), authorId: me.id, authorName: me.name, text: input.text, players: input.players, media,
        createdAt: Date.now(), likes: [], reports: [], masked: input.masked, caution: input.caution,
      }
      try {
        const tx = (await db()).transaction(['posts', 'media'], 'readwrite')
        for (const f of files) tx.objectStore('media').put({ id: f.id, type: f.type, data: f.data } satisfies MediaRecord)
        tx.objectStore('posts').put(post)
        await finished(tx)
      } catch (e) {
        throw storageError(e)
      }
      await notify()
      return post
    },

    async toggleLike(id) {
      const [me, p] = await Promise.all([user().then(requireUser), getPost(id)])
      await putPost({ ...p, likes: toggledLikes(p, me.id) })
    },

    async report(id) {
      const [me, p] = await Promise.all([user().then(requireUser), getPost(id)])
      await putPost({ ...p, reports: reportedBy(p, me.id) })
    },

    async remove(id) {
      const [me, p] = await Promise.all([user().then(requireUser), getPost(id)])
      assertAuthor(p, me.id)
      const tx = (await db()).transaction(['posts', 'media'], 'readwrite')
      tx.objectStore('posts').delete(id)
      for (const m of p.media) tx.objectStore('media').delete(m.id)
      await finished(tx)
      for (const m of p.media) {
        const url = urls.get(m.id)
        if (url) URL.revokeObjectURL(url)
        urls.delete(m.id)
      }
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
      await applySeeds(await db(), opts.seeds ?? [], true)
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
