import { IDBFactory } from 'fake-indexeddb'
import { afterEach, describe, expect, it } from 'vitest'
import { seedStars } from '../seedPlayers'
import { getDataSource } from '../registry'
import type { MarketRepository } from '../source'
import type { NewListing, PlayerId } from '../types'
import { createBrowserMarket } from './browser'
import { createMemoryMarket } from './memory'
import { DEMO_SELLERS, demoMarketSeeds, type SeedListing } from './seed'

const ME = { id: 'local:me', name: '나' }
const YOU = { id: 'local:you', name: '나' }
const A = 'demo:1' as PlayerId

const ds = await getDataSource('demo').load()
const seeds = demoMarketSeeds(ds)
const slugger = seedStars(ds).sluggers[0]

const item = (over: Partial<NewListing> = {}): NewListing => ({
  title: '응원 타월', category: 'towel', players: [A], price: 10_000, condition: '좋음', text: '깨끗해요', caution: false, files: [], ...over,
})
const photo = () => ({ blob: new Blob(['사진'], { type: 'image/png' }), kind: '사진' as const, name: 'a.png' })

const opened: { close?: () => void }[] = []
afterEach(() => {
  opened.splice(0).forEach((r) => r.close?.())
})

function setup(kind: 'memory' | 'browser', s?: SeedListing[]) {
  const clock = { t: new Date(2026, 10, 7, 15, 0).getTime() }
  const now = () => clock.t
  if (kind === 'browser') {
    const indexedDB = new IDBFactory()
    const a = createBrowserMarket({ indexedDB, user: ME, seeds: s, now })
    const b = createBrowserMarket({ indexedDB, user: YOU, seeds: s, now })
    opened.push(a, b)
    return { me: a as MarketRepository, you: b as MarketRepository, browser: a, clock, indexedDB }
  }
  return { me: createMemoryMarket({ user: ME, seeds: s, now }), you: null, browser: null, clock, indexedDB: null }
}

describe('예시 판매글', () => {
  it('판매자 4명, 판매글 5개. 장타자 판매글 2개(마킹 시연, 사기 경고 시연), 사진 1장', () => {
    expect(seeds).toHaveLength(5)
    expect(new Set(seeds.map((s) => s.authorId)).size).toBe(4)
    expect(seeds.filter((s) => s.players.includes(slugger.id)).map((s) => s.id)).toEqual(['demo-listing-1', 'demo-listing-2'])
    expect(seeds[1]).toMatchObject({ authorId: DEMO_SELLERS.scam.id, price: 15_000 })
    expect(seeds.flatMap((s) => s.media)).toHaveLength(1)
  })

  it('타자가 없으면 빈 목록', () => {
    expect(demoMarketSeeds({ hitters: [], pitchers: [] })).toEqual([])
  })
})

describe.each(['memory', 'browser'] as const)('마켓 저장소 (%s)', (kind) => {
  it('예시 판매글이 처음부터 있다 (최신순, 시각은 지금 기준), 장바구니는 비었다', async () => {
    const { me, clock } = setup(kind, seeds)
    const s = await me.snapshot()
    expect(s.listings.map((l) => l.id)).toEqual(seeds.map((x) => x.id))
    expect(s.listings[0].createdAt).toBe(clock.t - 50 * 60_000)
    expect(s.cart).toEqual([])
  })

  it('판매글을 올리면 맨 위에 나오고(사진 포함), 구독자에게 알린다', async () => {
    const { me, clock } = setup(kind, seeds)
    const seen: number[] = []
    const off = me.subscribe((s) => seen.push(s.listings.length))
    clock.t += 1000
    const l = await me.createListing(item({ files: [photo()] }))
    off()
    const s = await me.snapshot()
    expect(s.listings[0]).toMatchObject({ id: l.id, authorId: ME.id, sellerName: '나', title: '응원 타월', price: 10_000, reports: [] })
    expect(l.media).toHaveLength(1)
    expect(seen).toEqual([6])
  })

  it('자기 판매글만 지우고, 자기 판매글은 신고할 수 없다', async () => {
    const { me } = setup(kind, seeds)
    const l = await me.createListing(item())
    await expect(me.report(l.id)).rejects.toThrow('자기 글은')
    await expect(me.remove(seeds[0].id)).rejects.toThrow('자기 글만')
    await me.report(seeds[0].id)
    await me.report(seeds[0].id)
    await me.remove(l.id)
    const s = await me.snapshot()
    expect(s.listings.find((x) => x.id === seeds[0].id)!.reports).toEqual([ME.id])
    expect(s.listings.some((x) => x.id === l.id)).toBe(false)
  })

  it('장바구니를 저장한다', async () => {
    const { me } = setup(kind, seeds)
    await me.saveCart([{ kind: 'store', productId: 'store:x:cap', qty: 2 }, { kind: 'listing', listingId: seeds[0].id }])
    expect((await me.snapshot()).cart).toHaveLength(2)
  })

  it('시연 데이터 초기화: 내 판매글·신고·장바구니를 지우고 예시 판매글을 처음 상태로', async () => {
    const { me } = setup(kind, seeds)
    await me.createListing(item())
    await me.report(seeds[0].id)
    await me.saveCart([{ kind: 'listing', listingId: seeds[0].id }])
    await me.resetDemoData!()
    const s = await me.snapshot()
    expect(s.listings).toHaveLength(5)
    expect(s.listings.every((l) => l.reports.length === 0)).toBe(true)
    expect(s.cart).toEqual([])
  })
})

describe('브라우저 마켓 저장소', () => {
  it('다시 열어도(새로고침) 판매글·사진·장바구니·예시 판매글 신고가 남는다', async () => {
    const { me, you, browser, indexedDB } = setup('browser', seeds)
    const l = await me.createListing(item({ files: [photo()] }))
    await me.saveCart([{ kind: 'listing', listingId: seeds[0].id }])
    await you!.report(seeds[0].id)
    const again = createBrowserMarket({ indexedDB: indexedDB!, user: ME, seeds })
    opened.push(again)
    const s = await again.snapshot()
    expect(s.listings.some((x) => x.id === l.id)).toBe(true)
    expect(s.listings.find((x) => x.id === seeds[0].id)!.reports).toEqual([YOU.id])
    expect(s.cart).toEqual([{ kind: 'listing', listingId: seeds[0].id }])
    expect(await (await again.readMedia(l.media[0].id))!.text()).toBe('사진')
    expect(await (await browser!.readMedia('demo-listing-media-1'))!.text()).toContain('<svg')
  })

  it('판매글을 지우면 사진도 지운다', async () => {
    const { browser } = setup('browser')
    const l = await browser!.createListing(item({ files: [photo()] }))
    await browser!.remove(l.id)
    expect(await browser!.readMedia(l.media[0].id)).toBeNull()
  })
})
