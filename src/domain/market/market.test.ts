import { describe, expect, it } from 'vitest'
import type { CartLine, MarketListing, PlayerId } from '../../data/types'
import { goodsSvg, svgDataUrl } from './art'
import { addToCart, canBuyListing, demoOrderNumber, inCart, removeLine, setQty, summarizeCart, FREE_SHIPPING_FROM, SELLER_SHIPPING, STORE_SHIPPING } from './cart'
import { CATEGORIES, storeCatalog, teamMark, teamsOf, won } from './catalog'
import { bannedReasons, checkPhotos, isSuspiciouslyCheap, lastListingAt, listingWarnings, MAX_PHOTO_BYTES, playerListings, prepareListing, type ListingDraft } from './listing'

const A = 'demo:1' as PlayerId
const B = 'demo:2' as PlayerId
const players = [{ id: A, name: '김도윤' }, { id: B, name: '이하준' }]
const NOW = new Date(2026, 10, 7, 15, 0).getTime()
const ctx = { players, lastPostAt: null, now: NOW }
const TEAMS = ['한빛 수달스', '태백 산양스', '청운 해오라기스', '금강 반딧불스', '남해 돌고래스', '북악 부엉이스']

const draft = (over: Partial<ListingDraft> = {}): ListingDraft => ({
  title: '김도윤 홈 유니폼', text: '두 번 입었어요. 택 있어요.', category: 'uniform', price: 60_000, condition: '아주 좋음',
  players: [], photoCount: 1, agreed: true, ...over,
})

const listing = (over: Partial<MarketListing> = {}): MarketListing => ({
  id: 'l1', authorId: 'seller-1', sellerName: '수달팬', title: '김도윤 응원 타월', category: 'towel', players: [A], price: 10_000,
  condition: '좋음', text: '', media: [], createdAt: NOW, reports: [], caution: false, ...over,
})

describe('공식 스토어 상품 목록', () => {
  const catalog = storeCatalog(TEAMS)

  it('가상 구단 6개 × 6종, 구단마다 다른 색, 가격은 종류별 공식가', () => {
    expect(catalog).toHaveLength(36)
    expect(new Set(catalog.map((p) => p.colors.main)).size).toBe(6)
    expect(catalog[0]).toMatchObject({ id: 'store:한빛 수달스:uniform', name: '한빛 수달스 홈 유니폼', price: 89_000, mark: '수달스' })
    expect(catalog.find((p) => p.id === '스토어 없음')).toBeUndefined()
  })

  it('구단 이름은 선수 목록에 나오는 순서대로 한 번씩', () => {
    expect(teamsOf([{ team: 'B' }, { team: 'A' }, { team: 'B' }])).toEqual(['B', 'A'])
    expect(teamMark('청운 해오라기스')).toBe('해오라기스')
  })

  it('상품 그림은 외부 이미지 없는 SVG이고, 구단 이름의 특수 문자는 이스케이프한다', () => {
    for (const c of Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]) {
      const svg = goodsSvg(c, catalog[0].colors, catalog[0].mark)
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
      expect(svg).not.toMatch(/href|<image|url\(/)
    }
    expect(goodsSvg('uniform', null, '<b>')).toContain('&#60;b&#62;')
    expect(svgDataUrl('<svg/>')).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E')
    expect(won(89000)).toBe('89,000원')
  })
})

describe('판매 금지 (차단)', () => {
  it.each([
    ['내일 경기 티켓 양도해요', '티켓 되팔기'],
    ['1루 좌석 양도', '티켓 되팔기'],
    ['입장권 2장', '티켓 되팔기'],
    ['김도윤 사진 넣어서 직접 제작한 쿠션', '비공식 상품'],
    ['자체제작 키링', '비공식 상품'],
    ['비공식 굿즈 팔아요', '비공식 상품'],
    ['직접 만든 슬로건', '비공식 상품'],
  ])('%s → %s', (text, reason) => {
    expect(bannedReasons(text).map((b) => b.reason)).toEqual([reason])
  })

  it('보통 공식 굿즈 판매글은 걸리지 않는다', () => {
    expect(bannedReasons('구단 공식몰에서 산 응원 타월, 한 번 썼어요')).toEqual([])
  })

  it('올리려고 하면 이유와 함께 막는다 (경고 확인을 해도 안 된다)', () => {
    const r = prepareListing(draft({ text: '선수 사진으로 직접 제작했어요', confirmWarnings: true }), ctx)
    expect(r).toMatchObject({ ok: false, reason: 'banned' })
    if (!r.ok) expect(r.message).toBe('판매할 수 없는 상품이에요. 비공식 상품(직접제작). 공식 굿즈만 팔 수 있어요.')
  })
})

describe('사기 방지·커스텀 경고', () => {
  it('기준 시세의 40%보다 싸면 경고 (기타 종류는 시세가 없어 보지 않는다)', () => {
    expect(isSuspiciouslyCheap('uniform', 35_599)).toBe(true)
    expect(isSuspiciouslyCheap('uniform', 35_600)).toBe(false)
    expect(isSuspiciouslyCheap('other', 1_000)).toBe(false)
  })

  it('선입금, 외부 메신저, 커스텀·마킹을 찾는다 (띄어쓰기 상관없이)', () => {
    const w = listingWarnings({ title: '마킹 유니폼', text: '입금 먼저 해 주세요. 카톡 abc123', category: 'uniform', price: 10_000 })
    expect(w.map((x) => x.kind)).toEqual(['지나치게 싼 가격', '선입금 요구', '외부 메신저 연락처', '커스텀·마킹'])
    expect(w[0].message).toBe('유니폼 기준 시세(89,000원)보다 지나치게 싼 가격이에요')
    expect(listingWarnings({ title: '응원 타월', text: '오픈채팅 open.kakao.com/o/x', category: 'towel', price: 12_000 }).map((x) => x.kind)).toEqual(['외부 메신저 연락처'])
    expect(listingWarnings({ title: '응원 타월', text: '깨끗해요', category: 'towel', price: 12_000 })).toEqual([])
  })

  it('경고가 있으면 확인을 받고, 그래도 올리면 경고와 함께 통과한다', () => {
    const d = draft({ title: '김도윤 커스텀 마킹 유니폼' })
    const r = prepareListing(d, ctx)
    expect(r).toMatchObject({ ok: false, reason: 'needs-confirm', warnings: ['「커스텀·마킹」 상품이에요. 구단 공식 마킹인지 확인하세요'] })
    const ok = prepareListing({ ...d, confirmWarnings: true }, ctx)
    expect(ok).toMatchObject({ ok: true, caution: false, warnings: [{ kind: '커스텀·마킹' }] })
  })
})

describe('판매글 검사', () => {
  it('보통 판매글은 바로 통과하고, 제목 속 선수 이름이 자동 태그된다', () => {
    expect(prepareListing(draft(), ctx)).toEqual({ ok: true, title: '김도윤 홈 유니폼', text: '두 번 입었어요. 택 있어요.', players: [A], price: 60_000, caution: false, warnings: [] })
  })

  it.each([
    [{ title: ' ' }, 'no-title'],
    [{ title: '가'.repeat(41) }, 'too-long'],
    [{ title: '홈 유니폼', players: [] }, 'no-player'],
    [{ price: Number.NaN }, 'bad-price'],
    [{ price: 999 }, 'bad-price'],
    [{ price: 1500.5 }, 'bad-price'],
    [{ photoCount: 5 }, 'too-many-photos'],
    [{ agreed: false }, 'not-agreed'],
  ] as const)('%o → %s', (over, reason) => {
    expect(prepareListing(draft(over as Partial<ListingDraft>), ctx)).toMatchObject({ ok: false, reason })
  })

  it('작성 제한은 커뮤니티와 같다: 심한 표현은 차단, 애매하면 확인 후 「주의」', () => {
    expect(prepareListing(draft({ text: '김도윤 얼굴부터 좆같이 생김' }), ctx)).toMatchObject({ ok: false, reason: 'blocked' })
    const amb = draft({ text: '니 말이 맞다 씨발 오늘 대박' })
    expect(prepareListing(amb, ctx)).toMatchObject({ ok: false, reason: 'needs-confirm' })
    expect(prepareListing({ ...amb, confirmWarnings: true }, ctx)).toMatchObject({ ok: true, caution: true })
  })

  it('30초에 한 번만 올릴 수 있다', () => {
    expect(prepareListing(draft(), { ...ctx, lastPostAt: NOW - 5_000 })).toMatchObject({ ok: false, reason: 'too-soon' })
    expect(lastListingAt([listing({ authorId: 'me', createdAt: 5 }), listing({ authorId: 'me', createdAt: 9 })], 'me')).toBe(9)
    expect(lastListingAt([], 'me')).toBeNull()
  })

  it('사진: PNG·JPG·WEBP, 장당 10MB, 최대 4장', () => {
    const f = (name: string, type: string, size = 100) => ({ name, type, size })
    const r = checkPhotos(3, [f('a.gif', 'image/gif'), f('b.png', 'image/png', MAX_PHOTO_BYTES + 1), f('c.jpg', 'image/jpeg'), f('d.webp', 'image/webp')])
    expect(r.accepted).toEqual([2])
    expect(r.errors).toEqual(['a.gif: PNG, JPG, WEBP 사진만 올릴 수 있어요', 'b.png: 10MB를 넘어요', '사진은 4장까지 올릴 수 있어요'])
  })

  it('선수 관련 판매글: 태그나 이름, 최신순', () => {
    const ls = [listing({ id: 'old', createdAt: 1 }), listing({ id: 'b', players: [B], title: '이하준 모자' }), listing({ id: 'name', players: [], title: '김도윤 키링', createdAt: 5 })]
    expect(playerListings(ls, players[0]).map((l) => l.id)).toEqual(['name', 'old'])
  })
})

describe('장바구니와 주문 확인', () => {
  const catalog = storeCatalog(TEAMS)
  const uni: CartLine = { kind: 'store', productId: catalog[0].id, qty: 1 }
  const towel: CartLine = { kind: 'store', productId: catalog[2].id, qty: 2 }

  it('공식 스토어 상품은 수량을 더하고(최대 10), 판매글은 한 번만 담긴다', () => {
    let cart = addToCart([], uni)
    cart = addToCart(cart, { ...uni, qty: 3 })
    expect(cart).toEqual([{ ...uni, qty: 4 }])
    expect(addToCart(cart, { ...uni, qty: 20 })[0]).toMatchObject({ qty: 10 })
    const l: CartLine = { kind: 'listing', listingId: 'l1' }
    expect(addToCart(addToCart(cart, l), l)).toHaveLength(2)
    expect(inCart(cart, uni)).toBe(true)
    expect(setQty(cart, uni.productId, 0)).toEqual([])
    expect(setQty(cart, uni.productId, 2)).toEqual([{ ...uni, qty: 2 }])
    expect(removeLine([uni, l], l)).toEqual([uni])
  })

  it('주문 확인: 공식 스토어가 먼저, 판매자별로 나누고 배송비를 따로 매긴다', () => {
    const ls = [listing({ id: 'l1', authorId: 's1', sellerName: '수달팬', price: 10_000 }), listing({ id: 'l2', authorId: 's2', sellerName: '산양응원단', price: 20_000 }), listing({ id: 'l3', authorId: 's1', sellerName: '수달팬', price: 5_000 })]
    const cart: CartLine[] = [{ kind: 'listing', listingId: 'l2' }, towel, { kind: 'listing', listingId: 'l1' }, { kind: 'listing', listingId: 'l3' }]
    const s = summarizeCart(cart, catalog, ls, 'me')
    expect(s.groups.map((g) => [g.label, g.items.length, g.subtotal, g.shipping])).toEqual([
      ['공식 스토어', 1, 30_000, STORE_SHIPPING],
      ['산양응원단', 1, 20_000, SELLER_SHIPPING],
      ['수달팬', 2, 15_000, SELLER_SHIPPING],
    ])
    expect(s).toMatchObject({ count: 5, itemsTotal: 65_000, shippingTotal: 10_000, total: 75_000 })
  })

  it('공식 스토어 5만 원 이상은 배송비 무료', () => {
    const s = summarizeCart([uni], catalog, [], 'me')
    expect(catalog[0].price).toBeGreaterThanOrEqual(FREE_SHIPPING_FROM)
    expect(s.groups[0].shipping).toBe(0)
  })

  it('없어진 상품, 자기 판매글, 신고로 가려진 판매글은 뺀다', () => {
    const mine = listing({ id: 'mine', authorId: 'me' })
    const hidden = listing({ id: 'hidden', reports: ['a', 'b', 'c'] })
    expect(canBuyListing(mine, 'me')).toBe(false)
    expect(canBuyListing(hidden, 'me')).toBe(false)
    const cart: CartLine[] = [{ kind: 'store', productId: 'store:없는 구단:cap', qty: 1 }, { kind: 'listing', listingId: 'mine' }, { kind: 'listing', listingId: 'hidden' }, { kind: 'listing', listingId: 'gone' }]
    expect(summarizeCart(cart, catalog, [mine, hidden], 'me')).toEqual({ groups: [], count: 0, itemsTotal: 0, shippingTotal: 0, total: 0 })
  })

  it('시연용 주문 번호', () => {
    expect(demoOrderNumber(NOW, 0.0421)).toBe('DEMO-20261107-0421')
  })
})

describe('예시 판매글', () => {
  it('마킹 시연 글은 커스텀·마킹 경고만, 사기 경고 시연 글은 세 가지 경고, 나머지는 경고 없이 규칙을 통과한다', async () => {
    const { demoMarketSeeds } = await import('../../data/market/seed')
    const { getDataSource } = await import('../../data/registry')
    const ds = await getDataSource('demo').load()
    const all = [...ds.hitters, ...ds.pitchers]
    const seeds = demoMarketSeeds(ds)
    expect(seeds.map((s) => listingWarnings(s).map((w) => w.kind))).toEqual([
      ['커스텀·마킹'], ['지나치게 싼 가격', '선입금 요구', '외부 메신저 연락처'], [], [], [],
    ])
    for (const s of seeds) {
      const r = prepareListing({ ...s, photoCount: s.media.length, agreed: true, confirmWarnings: true }, { players: all, lastPostAt: null, now: NOW })
      expect(r).toMatchObject({ ok: true, caution: false })
    }
  })
})
