import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { afterEach, describe, expect, it } from 'vitest'
import { StorageFullError, type CommunityRepository } from '../source'
import type { NewPost } from '../types'
import { createBrowserCommunity } from './browser'
import { createMemoryCommunity } from './memory'

const ME = { id: 'local:me', name: '나' }
const YOU = { id: 'local:you', name: '나' }
const text = (t: string): NewPost => ({ text: t, players: [], masked: false, caution: false, files: [] })
const withFile = (t: string): NewPost => ({
  text: t, players: ['demo:1'], masked: false, caution: false,
  files: [{ blob: new Blob(['사진 내용'], { type: 'image/png' }), kind: '사진', name: 'a.png' }],
})

const opened: { close?: () => void }[] = []
afterEach(() => {
  opened.splice(0).forEach((r) => r.close?.())
})

/** 같은 저장 공간을 쓰는 두 사용자 (내 글에 남이 신고·좋아요하는 경우를 흉내 낸다) */
function pair(kind: 'memory' | 'browser'): [CommunityRepository, CommunityRepository] {
  if (kind === 'browser') {
    const indexedDB = new IDBFactory()
    const a = createBrowserCommunity({ indexedDB, user: ME })
    const b = createBrowserCommunity({ indexedDB, user: YOU })
    opened.push(a, b)
    return [a, b]
  }
  const a = createMemoryCommunity({ user: ME })
  return [a, a] // 메모리 저장소는 인스턴스끼리 공유하지 않으므로 사용자 둘 검사는 browser에서만
}

describe.each(['memory', 'browser'] as const)('커뮤니티 저장소 (%s)', (kind) => {
  it('글을 쓰면 최신순 목록에 나오고 구독자에게 알린다', async () => {
    const [repo] = pair(kind)
    const seen: number[] = []
    const off = repo.subscribe((posts) => seen.push(posts.length))
    await repo.create(text('첫 글'))
    await new Promise((r) => setTimeout(r, 2))
    await repo.create(text('둘째 글'))
    off()
    const posts = await repo.list()
    expect(posts.map((p) => p.text)).toEqual(['둘째 글', '첫 글'])
    expect(posts[0]).toMatchObject({ authorId: ME.id, likes: [], reports: [], masked: false })
    expect(seen).toEqual([1, 2])
  })

  it('파일을 붙여 저장하고 주소를 얻는다', async () => {
    const [repo] = pair(kind)
    const post = await repo.create(withFile('사진 글'))
    expect(post.media).toEqual([{ id: expect.any(String), kind: '사진', type: 'image/png', name: 'a.png' }])
    expect(await repo.mediaUrl(post.media[0])).toMatch(/^blob:/)
  })

  it('좋아요는 켜고 끌 수 있다', async () => {
    const [repo] = pair(kind)
    const post = await repo.create(text('글'))
    await repo.toggleLike(post.id)
    expect((await repo.list())[0].likes).toEqual([ME.id])
    await repo.toggleLike(post.id)
    expect((await repo.list())[0].likes).toEqual([])
  })

  it('자기 글은 신고할 수 없다', async () => {
    const [repo] = pair(kind)
    const post = await repo.create(text('글'))
    await expect(repo.report(post.id)).rejects.toThrow('자기 글은 신고할 수 없습니다.')
  })

  it('자기 글을 지우면 목록에서 빠진다', async () => {
    const [repo] = pair(kind)
    const post = await repo.create(withFile('지울 글'))
    await repo.remove(post.id)
    expect(await repo.list()).toEqual([])
  })
})

describe('브라우저 저장소 (IndexedDB)', () => {
  it('새로고침(저장소를 새로 열기)해도 글과 파일 내용이 남는다', async () => {
    const indexedDB = new IDBFactory()
    const before = createBrowserCommunity({ indexedDB })
    const me = await before.currentUser()
    const post = await before.create(withFile('남아야 하는 글'))
    before.close()

    const after = createBrowserCommunity({ indexedDB })
    opened.push(after)
    expect(await after.currentUser()).toEqual(me) // 로컬 사용자도 그대로
    expect((await after.list()).map((p) => p.text)).toEqual(['남아야 하는 글'])
    const blob = await after.readMedia(post.media[0].id)
    expect(blob?.type).toBe('image/png')
    expect(await blob?.text()).toBe('사진 내용')
  })

  it('다른 사용자는 신고·좋아요를 한 번씩 남기고, 남의 글은 지울 수 없다', async () => {
    const [mine, yours] = pair('browser')
    const post = await mine.create(text('내 글'))
    await yours.report(post.id)
    await yours.report(post.id) // 두 번 신고해도 한 번
    await yours.toggleLike(post.id)
    expect((await mine.list())[0]).toMatchObject({ reports: [YOU.id], likes: [YOU.id] })
    await expect(yours.remove(post.id)).rejects.toThrow('자기 글만 지울 수 있습니다.')
  })

  it('글을 지우면 붙은 파일도 지운다', async () => {
    const [repo] = pair('browser') as unknown as [ReturnType<typeof createBrowserCommunity>]
    const post = await repo.create(withFile('지울 글'))
    await repo.remove(post.id)
    expect(await repo.readMedia(post.media[0].id)).toBeNull()
  })

  it('저장 공간이 가득 차면 StorageFullError로 알린다', async () => {
    const indexedDB = new IDBFactory()
    const repo = createBrowserCommunity({ indexedDB, user: ME })
    opened.push(repo)
    await repo.list()
    // 트랜잭션 쓰기가 용량 초과로 실패하는 상황을 흉내 낸다
    const realPut = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('quota', 'QuotaExceededError')
    }
    try {
      await expect(repo.create(text('큰 글'))).rejects.toBeInstanceOf(StorageFullError)
    } finally {
      IDBObjectStore.prototype.put = realPut
    }
  })
})
