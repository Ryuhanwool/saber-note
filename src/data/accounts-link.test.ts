// 커뮤니티·응원방·마켓 저장소와 로그인 계정 연결: 작성자 id·닉네임 저장, 로그아웃 상태에서는 읽기만
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, describe, expect, it } from 'vitest'
import { createBrowserCheer } from './cheer/browser'
import { createMemoryCheer } from './cheer/memory'
import { createBrowserCommunity } from './community/browser'
import { createMemoryCommunity } from './community/memory'
import { createBrowserMarket } from './market/browser'
import { createMemoryMarket } from './market/memory'
import type { CommunityPost, PlayerId } from './types'

const ACCT = { id: 'acct:1', name: '수달팬' }
const A = 'demo:1' as PlayerId
const opened: { close?: () => void }[] = []
afterEach(() => {
  opened.splice(0).forEach((r) => r.close?.())
})
const keep = <T extends { close?: () => void }>(r: T) => (opened.push(r), r)

const listing = { title: '응원 타월', category: 'towel' as const, players: [A], price: 10_000, condition: '좋음' as const, text: '', caution: false, files: [] }

describe.each(['memory', 'browser'] as const)('로그인 계정 연결 (%s)', (kind) => {
  const open = (user: { id: string; name: string } | null, indexedDB = new IDBFactory()) =>
    kind === 'memory'
      ? { community: createMemoryCommunity({ user }), cheer: createMemoryCheer({ user }), market: createMemoryMarket({ user }) }
      : {
          community: keep(createBrowserCommunity({ indexedDB, user })),
          cheer: keep(createBrowserCheer({ indexedDB, user })),
          market: keep(createBrowserMarket({ indexedDB, user })),
        }

  it('로그인하면 작성자 id와 쓸 때의 닉네임을 저장한다', async () => {
    const r = open(ACCT)
    expect(await r.community.create({ text: '글', players: [], masked: false, caution: false, files: [] })).toMatchObject({ authorId: ACCT.id, authorName: '수달팬' })
    expect(await r.cheer.postMessage({ playerId: A, text: '화이팅', caution: false })).toMatchObject({ authorId: ACCT.id, authorName: '수달팬' })
    expect(await r.market.createListing(listing)).toMatchObject({ authorId: ACCT.id, sellerName: '수달팬' })
  })

  it('로그아웃 상태(null)면 읽기만 되고 쓰기는 "로그인이 필요합니다"', async () => {
    const r = open(null)
    expect(await r.community.currentUser()).toBeNull()
    expect(await r.community.list()).toEqual([])
    const login = '로그인이 필요합니다.'
    await expect(r.community.create({ text: '글', players: [], masked: false, caution: false, files: [] })).rejects.toThrow(login)
    await expect(r.cheer.cheer(A)).rejects.toThrow(login)
    await expect(r.cheer.postMessage({ playerId: A, text: '화이팅', caution: false })).rejects.toThrow(login)
    await expect(r.market.createListing(listing)).rejects.toThrow(login)
    await r.market.saveCart([{ kind: 'store', productId: 'x', qty: 1 }]) // 장바구니는 로그인 없이 담는다
    expect((await r.market.snapshot()).cart).toHaveLength(1)
  })
})

describe('로그인 기능 전에 쓴 글', () => {
  it('닉네임 필드가 없던 예전 글은 null로 읽고, 다른 계정은 지울 수 없다 (신고는 된다)', async () => {
    const indexedDB = new IDBFactory()
    const old = keep(createBrowserCommunity({ indexedDB })) // 예전처럼 익명 사용자(local:…)
    const p = await old.create({ text: '예전 글', players: [], masked: false, caution: false, files: [] })
    expect(p.authorId).toMatch(/^local:/)
    // 예전 저장 형식: authorName 필드 없음
    const { authorName: _drop, ...legacy } = p
    void _drop
    const tx = await new Promise<IDBDatabase>((res) => {
      const r = indexedDB.open('saber-note-community')
      r.onsuccess = () => res(r.result)
    })
    await new Promise<void>((res) => {
      const t = tx.transaction('posts', 'readwrite')
      t.objectStore('posts').put(legacy as Omit<CommunityPost, 'authorName'>)
      t.oncomplete = () => res()
    })
    tx.close()
    const now = keep(createBrowserCommunity({ indexedDB, user: ACCT }))
    const [read] = await now.list()
    expect(read).toMatchObject({ id: p.id, authorName: null })
    await expect(now.remove(p.id)).rejects.toThrow('자기 글만')
    await now.report(p.id)
    expect((await now.list())[0].reports).toEqual([ACCT.id])
  })
})
