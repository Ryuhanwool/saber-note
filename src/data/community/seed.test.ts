import { IDBFactory } from 'fake-indexeddb'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDataSource } from '../registry'
import { DEMO_AUTHOR_ID } from '../types'
import { createBrowserCommunity } from './browser'
import { createMemoryCommunity } from './memory'
import { DEMO_REPORTERS, demoCommunitySeeds, seedToPost } from './seed'

const ds = await getDataSource('demo').load()
const seeds = demoCommunitySeeds(ds)
const byId = new Map([...ds.hitters, ...ds.pitchers].map((p) => [p.id, p]))

afterEach(() => {
  vi.useRealTimers()
})

describe('시연용 예시 글 만들기', () => {
  it('리그 기록으로 예시 글 6개를 만들고, 그중 하나에 사진이 붙는다', () => {
    expect(seeds).toHaveLength(6)
    expect(new Set(seeds.map((s) => s.id)).size).toBe(6)
    const withPhoto = seeds.filter((s) => s.media.length)
    expect(withPhoto).toHaveLength(1)
    expect(withPhoto[0].media[0]).toMatchObject({ kind: '사진', type: 'image/svg+xml' })
  })

  it('태그한 선수는 리그에 있고, 본문에 그 선수 이름과 실제 기록이 나온다', () => {
    const slugger = ds.hitters.reduce((a, b) => (b.HR > a.HR ? b : a))
    expect(seeds[0].text).toContain(`${slugger.name} 벌써 홈런 ${slugger.HR}개`)
    for (const s of seeds) {
      for (const id of s.players) {
        expect(byId.has(id), id).toBe(true)
        expect(s.text).toContain(byId.get(id)!.name)
      }
    }
  })

  it('신고 시연용 글 하나는 신고가 2번 쌓인 채로 시작하고, 나머지는 신고가 없다', () => {
    const reported = seeds.filter((s) => s.reports.length)
    expect(reported.map((s) => s.id)).toEqual(['demo-post-6'])
    expect(reported[0].reports).toEqual(DEMO_REPORTERS)
    expect(reported[0].text).toContain('신고 시연용')
  })

  it('타자가 없으면 예시 글을 만들지 않는다', () => {
    expect(demoCommunitySeeds({ hitters: [], pitchers: [] })).toEqual([])
  })

  it('저장할 때는 데모 작성자로, 작성 시각은 지금 기준으로 맞추고, 이미 받은 좋아요·신고는 둔다', () => {
    const now = 1_800_000_000_000
    const post = seedToPost(seeds[1], now, { ...seedToPost(seeds[1], 0), likes: ['a'], reports: ['b'] })
    expect(post).toMatchObject({ authorId: DEMO_AUTHOR_ID, createdAt: now - seeds[1].ageMs, likes: ['a'], reports: ['b'] })
  })
})

describe('예시 글이 든 저장소', () => {
  it('브라우저 저장소: 처음 열면 예시 글과 사진이 있고, 다시 열면 좋아요는 남고 작성 시각은 다시 맞춘다', async () => {
    const indexedDB = new IDBFactory()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-07T03:00:00Z'))
    const first = createBrowserCommunity({ indexedDB, seeds })
    const posts = await first.list()
    expect(posts.map((p) => p.id)).toEqual(seeds.map((s) => s.id)) // 최신순 = 짧은 ageMs 순
    expect(posts.every((p) => p.authorId === DEMO_AUTHOR_ID)).toBe(true)
    expect(await (await first.readMedia('demo-media-1'))?.text()).toContain('<svg')
    await first.toggleLike('demo-post-2')
    await expect(first.remove('demo-post-1')).rejects.toThrow('자기 글만 지울 수 있습니다.')
    first.close()

    vi.setSystemTime(new Date('2026-12-25T03:00:00Z')) // 한 달 넘게 지나 다시 연다
    const later = createBrowserCommunity({ indexedDB, seeds })
    const again = await later.list()
    const second = again.find((p) => p.id === 'demo-post-2')!
    expect(second.likes).toHaveLength(1)
    expect(second.createdAt).toBe(Date.now() - seeds[1].ageMs)
    expect(again).toHaveLength(seeds.length) // 다시 열어도 예시 글이 늘어나지 않는다
    later.close()
  })

  it('메모리 저장소도 예시 글과 사진 주소를 준다', async () => {
    const repo = createMemoryCommunity({ seeds })
    const posts = await repo.list()
    expect(posts).toHaveLength(6)
    const photo = posts.find((p) => p.media.length)!.media[0]
    expect(await repo.mediaUrl(photo)).toMatch(/^blob:/)
  })
})

describe('신고 시연과 시연 데이터 초기화', () => {
  it('신고 시연용 글은 내가 한 번 신고하면 3번이 되어 가려진다', async () => {
    const repo = createBrowserCommunity({ indexedDB: new IDBFactory(), user: { id: 'local:me', name: '나' }, seeds })
    await repo.report('demo-post-6')
    const post = (await repo.list()).find((p) => p.id === 'demo-post-6')!
    expect(post.reports).toEqual([...DEMO_REPORTERS, 'local:me'])
    expect(post.reports).toHaveLength(3) // 신고 3번이면 가려진다 (domain/community/posts.ts REPORT_HIDE_THRESHOLD)
    repo.close()
  })

  it.each(['browser', 'memory'] as const)('%s: 초기화하면 내 글·파일과 좋아요·신고가 지워지고 예시 글이 처음 상태로 돌아간다', async (kind) => {
    const user = { id: 'local:me', name: '나' }
    const repo = kind === 'browser' ? createBrowserCommunity({ indexedDB: new IDBFactory(), user, seeds }) : createMemoryCommunity({ user, seeds })
    const fresh = await repo.list()
    const mine = await repo.create({
      text: '내 글', players: [], masked: false,
      files: [{ blob: new Blob(['x'], { type: 'image/png' }), kind: '사진', name: 'a.png' }],
    })
    await repo.toggleLike('demo-post-1')
    await repo.report('demo-post-6')
    expect(await repo.list()).toHaveLength(seeds.length + 1)

    await repo.resetDemoData!()
    const after = await repo.list()
    expect(after.map((p) => p.id)).toEqual(fresh.map((p) => p.id))
    expect(after.find((p) => p.id === 'demo-post-1')!.likes).toEqual([])
    expect(after.find((p) => p.id === 'demo-post-6')!.reports).toEqual(DEMO_REPORTERS)
    expect(await repo.mediaUrl(mine.media[0])).toBeNull() // 내 파일도 지워졌다
    expect(await repo.mediaUrl(after.find((p) => p.media.length)!.media[0])).toMatch(/^blob:/) // 예시 사진은 남는다
    repo.close?.()
  })

  it('초기화하면 구독자에게 알린다', async () => {
    const repo = createMemoryCommunity({ seeds })
    await repo.create({ text: '내 글', players: [], masked: false, files: [] })
    const seen: number[] = []
    repo.subscribe((posts) => seen.push(posts.length))
    await repo.resetDemoData!()
    expect(seen).toEqual([seeds.length])
  })
})
