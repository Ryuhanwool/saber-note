// 브라우저 설정 저장소: 설정 값은 localStorage, 내 배경 이미지는 IndexedDB에 둔다. 새로고침해도 남는다.
import { StorageFullError, type SettingsStore } from '../source'
import { normalizeSettings } from './shared'

export const SETTINGS_KEY = 'saber-note-settings'
/**
 * 저장 형식 버전. 2: 야구 소품 장식 기본값을 꺼짐으로 바꿨다 (2026-11-08).
 * 버전이 없는 예전 값은 장식 기본값이 켜짐이던 때 통째로 저장된 것이라, 장식만 새 기본값(꺼짐)으로 돌린다.
 */
export const SETTINGS_VERSION = 2
export const SETTINGS_DB = 'saber-note-settings'
const IMAGE_KEY = 'background'

type ImageRecord = { key: string; type: string; data: ArrayBuffer }

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
    const r = factory.open(SETTINGS_DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore('images', { keyPath: 'key' })
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export function createBrowserSettings(opts: { indexedDB?: IDBFactory; storage?: Storage } = {}): SettingsStore {
  const factory = opts.indexedDB ?? globalThis.indexedDB
  const storage = opts.storage ?? globalThis.localStorage
  let dbPromise: Promise<IDBDatabase> | null = null
  const db = () => (dbPromise ??= openDb(factory))

  return {
    persistent: true,

    async load() {
      try {
        const raw = JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null') as Record<string, unknown> | null
        if (raw && typeof raw === 'object' && raw.v !== SETTINGS_VERSION) delete raw.decorations
        return normalizeSettings(raw)
      } catch {
        return normalizeSettings(null) // 망가진 값이면 기본값
      }
    },

    async save(settings) {
      storage.setItem(SETTINGS_KEY, JSON.stringify({ ...normalizeSettings(settings), v: SETTINGS_VERSION }))
    },

    async loadBackground() {
      const tx = (await db()).transaction('images', 'readonly')
      const rec = await request(tx.objectStore('images').get(IMAGE_KEY) as IDBRequest<ImageRecord | undefined>)
      return rec ? new Blob([rec.data], { type: rec.type }) : null
    },

    async saveBackground(image) {
      // 파일 읽기(await)는 트랜잭션 전에 끝낸다
      const data = image ? await image.arrayBuffer() : null
      try {
        const tx = (await db()).transaction('images', 'readwrite')
        if (image && data) tx.objectStore('images').put({ key: IMAGE_KEY, type: image.type, data } satisfies ImageRecord)
        else tx.objectStore('images').delete(IMAGE_KEY)
        await finished(tx)
      } catch (e) {
        throw e instanceof DOMException && e.name === 'QuotaExceededError' ? new StorageFullError() : e
      }
    },
  }
}
