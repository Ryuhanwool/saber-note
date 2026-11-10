import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, describe, expect, it } from 'vitest'
import type { ProfileRepository } from '../source'
import { createBrowserProfile } from './browser'
import { createMemoryProfile, type MemoryProfileStore } from './memory'

const ME = { id: 'acct:me', name: '나팬' }
const YOU = { id: 'acct:you', name: '너팬' }
const png = (s: string) => new Blob([s], { type: 'image/png' })
const opened: { close?(): void }[] = []
afterEach(() => opened.splice(0).forEach((r) => r.close?.()))

for (const kind of ['memory', 'browser'] as const) {
  describe(`프로필 저장소 (${kind})`, () => {
    const setup = () => {
      const indexedDB = new IDBFactory()
      const store: MemoryProfileStore = new Map()
      return (user: typeof ME | null): ProfileRepository => {
        const r = kind === 'memory' ? createMemoryProfile({ user, store }) : createBrowserProfile({ user, indexedDB })
        opened.push(r)
        return r
      }
    }

    it('처음에는 사진도, 마지막으로 본 때도 없다', async () => {
      expect(await setup()(ME).snapshot()).toEqual({ image: null, seen: {} })
    })

    it('사진은 계정마다 따로 저장되고, 다시 열어도(새로고침) 남는다. 기본 엠블럼으로 되돌릴 수 있다', async () => {
      const open = setup()
      await open(ME).setImage(png('me'))
      const again = await open(ME).snapshot()
      expect(again.image?.type).toBe('image/png')
      expect(await again.image!.text()).toBe('me')
      expect((await open(YOU).snapshot()).image).toBeNull()
      const r = open(ME)
      await r.setImage(null)
      expect((await r.snapshot()).image).toBeNull()
    })

    it('로그아웃 상태에서는 사진을 바꿀 수 없다', async () => {
      await expect(setup()(null).setImage(png('x'))).rejects.toThrow('로그인이 필요합니다')
    })

    it('마지막으로 본 때: 계정·손님 따로, 예전 시각으로 되돌아가지 않는다', async () => {
      const open = setup()
      const me = open(ME)
      await me.markSeen('news', 2000)
      await me.markSeen('news', 1000)
      await me.markSeen('community', 1500)
      expect((await open(ME).snapshot()).seen).toEqual({ news: 2000, community: 1500 })
      const guest = open(null)
      await guest.markSeen('news', 500)
      expect((await open(null).snapshot()).seen).toEqual({ news: 500 })
    })

    it('바뀌면 구독자에게 알린다', async () => {
      const r = setup()(ME)
      const got: unknown[] = []
      r.subscribe((s) => got.push(s.seen))
      await r.markSeen('community', 10)
      expect(got).toEqual([{ community: 10 }])
    })

    it('시연 데이터 초기화: 모든 계정의 사진과 마지막으로 본 때를 지운다', async () => {
      const open = setup()
      await open(ME).setImage(png('me'))
      await open(YOU).markSeen('news', 9)
      await open(ME).resetDemoData!()
      expect(await open(ME).snapshot()).toEqual({ image: null, seen: {} })
      expect(await open(YOU).snapshot()).toEqual({ image: null, seen: {} })
    })
  })
}
