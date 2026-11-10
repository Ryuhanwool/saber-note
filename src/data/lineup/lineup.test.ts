import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, describe, expect, it } from 'vitest'
import type { LineupRepository } from '../source'
import type { LineupDraft, SavedLineup } from '../types'
import { createBrowserLineup } from './browser'
import { createMemoryLineup } from './memory'

const ME = { id: 'acct:me', name: '나팬' }
const YOU = { id: 'acct:you', name: '너팬' }
const draft = (c: string): LineupDraft => ({
  slots: { C: c as `demo:${number}`, '1B': null, '2B': null, '3B': null, SS: null, LF: null, CF: null, RF: null, DH: null, SP: null, MR: null, CL: null },
  order: ['C'],
})
const opened: { close?(): void }[] = []
afterEach(() => opened.splice(0).forEach((r) => r.close?.()))

for (const kind of ['memory', 'browser'] as const) {
  describe(`라인업 저장소 (${kind})`, () => {
    const setup = () => {
      const indexedDB = new IDBFactory()
      const store = new Map<string, SavedLineup>()
      const open = (user: typeof ME | null): LineupRepository => {
        const r = kind === 'memory' ? createMemoryLineup({ user, store, now: () => 1000 }) : createBrowserLineup({ user, indexedDB, now: () => 1000 })
        opened.push(r)
        return r
      }
      return { open }
    }

    it('로그인 없이는 저장되지 않는다', async () => {
      const { open } = setup()
      const anon = open(null)
      await expect(anon.save(draft('demo:1'))).rejects.toThrow('로그인이 필요합니다')
      expect(await anon.mine()).toBeNull()
    })

    it('계정마다 1개: 저장하면 덮어쓰고, 다른 계정과 섞이지 않으며, 구독자에게 알린다', async () => {
      const { open } = setup()
      const me = open(ME), you = open(YOU)
      const seen: (SavedLineup | null)[] = []
      me.subscribe((l) => seen.push(l))
      await me.save(draft('demo:1'))
      await me.save(draft('demo:2'))
      await you.save(draft('demo:3'))
      expect((await me.mine())!.slots.C).toBe('demo:2')
      expect((await you.mine())!.slots.C).toBe('demo:3')
      expect(seen.at(-1)!.slots.C).toBe('demo:2')
      expect((await me.mine())!.accountId).toBe(ME.id)
    })

    if (kind === 'browser') {
      it('다시 열어도(새로고침) 라인업이 남는다', async () => {
        const indexedDB = new IDBFactory()
        const a = createBrowserLineup({ user: ME, indexedDB })
        await a.save(draft('demo:5'))
        a.close()
        const b = createBrowserLineup({ user: ME, indexedDB })
        opened.push(b)
        expect((await b.mine())!.slots.C).toBe('demo:5')
      })
    }

    it('시연 데이터 초기화: 모든 계정의 라인업을 지운다', async () => {
      const { open } = setup()
      const me = open(ME), you = open(YOU)
      await me.save(draft('demo:1'))
      await you.save(draft('demo:2'))
      await me.resetDemoData!()
      expect(await me.mine()).toBeNull()
      expect(await you.mine()).toBeNull()
    })
  })
}
