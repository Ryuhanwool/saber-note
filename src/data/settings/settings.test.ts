import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { DEFAULT_DISPLAY_SETTINGS } from '../types'
import { createBrowserSettings, SETTINGS_KEY, SETTINGS_VERSION } from './browser'
import { createMemorySettings } from './memory'
import { normalizeSettings } from './shared'

/** localStorage 대신 쓸 간단한 저장소 */
function fakeStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  }
}

describe('설정 값 정리', () => {
  it('없거나 망가진 값은 기본값으로, 알맞은 값만 남긴다', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_DISPLAY_SETTINGS)
    expect(normalizeSettings({ themeId: 'navy-gold', decorations: 'yes', extra: 1 })).toEqual({ ...DEFAULT_DISPLAY_SETTINGS, themeId: 'navy-gold' })
    expect(DEFAULT_DISPLAY_SETTINGS).toEqual({ themeId: 'default', decorations: false, maskProfanity: true, bgStrength: 'medium' }) // 장식 꺼짐, 배경 진하기 보통
    expect(normalizeSettings({ bgStrength: 'very-strong' }).bgStrength).toBe('medium')
    expect(normalizeSettings({ bgStrength: 'soft' }).bgStrength).toBe('soft')
  })
})

describe('브라우저 설정 저장소', () => {
  it('설정과 배경 이미지가 새로고침(저장소를 새로 열기) 뒤에도 남는다', async () => {
    const indexedDB = new IDBFactory()
    const storage = fakeStorage()
    const before = createBrowserSettings({ indexedDB, storage })
    await before.save({ themeId: 'orange-black', decorations: false, maskProfanity: false, bgStrength: 'strong' })
    await before.saveBackground(new Blob(['사진'], { type: 'image/jpeg' }))

    const after = createBrowserSettings({ indexedDB, storage })
    expect(await after.load()).toEqual({ themeId: 'orange-black', decorations: false, maskProfanity: false, bgStrength: 'strong' })
    const img = await after.loadBackground()
    expect(img?.type).toBe('image/jpeg')
    expect(await img?.text()).toBe('사진')
  })

  it('기본 배경으로 되돌리면 이미지가 지워진다', async () => {
    const repo = createBrowserSettings({ indexedDB: new IDBFactory(), storage: fakeStorage() })
    await repo.saveBackground(new Blob(['x'], { type: 'image/png' }))
    await repo.saveBackground(null)
    expect(await repo.loadBackground()).toBeNull()
  })

  it('저장된 값이 망가져 있어도 기본값으로 연다', async () => {
    const storage = fakeStorage()
    storage.setItem(SETTINGS_KEY, '{망가진 JSON')
    expect(await createBrowserSettings({ indexedDB: new IDBFactory(), storage }).load()).toEqual(DEFAULT_DISPLAY_SETTINGS)
  })
})

describe('메모리 설정 저장소', () => {
  it('저장한 값을 돌려주고, 새로고침하면 사라지는 저장소라고 알린다', async () => {
    const repo = createMemorySettings()
    expect(repo.persistent).toBe(false)
    await repo.save({ ...DEFAULT_DISPLAY_SETTINGS, themeId: 'navy-red' })
    expect((await repo.load()).themeId).toBe('navy-red')
    await repo.saveBackground(new Blob(['x'], { type: 'image/png' }))
    expect(await repo.loadBackground()).not.toBeNull()
  })
})

describe('저장 형식 버전 (장식 기본값을 꺼짐으로 바꾼 뒤)', () => {
  it('버전이 없는 예전 값은 장식만 새 기본값(꺼짐)으로, 새로 저장한 값은 그대로', async () => {
    const storage = fakeStorage()
    storage.setItem(SETTINGS_KEY, JSON.stringify({ themeId: 'navy-gold', decorations: true, maskProfanity: false }))
    const store = createBrowserSettings({ indexedDB: new IDBFactory(), storage })
    expect(await store.load()).toEqual({ themeId: 'navy-gold', decorations: false, maskProfanity: false, bgStrength: 'medium' }) // 배경 진하기가 없던 값은 보통
    await store.save({ themeId: 'navy-gold', decorations: true, maskProfanity: false, bgStrength: 'soft' })
    expect(JSON.parse(storage.getItem(SETTINGS_KEY)!)).toMatchObject({ v: SETTINGS_VERSION, decorations: true })
    expect((await store.load()).decorations).toBe(true)
  })
})
