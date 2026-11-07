import { IDBFactory } from 'fake-indexeddb'
import { afterEach, describe, expect, it } from 'vitest'
import { getDataSource } from '../registry'
import { AlreadyCheeredError, type CheerRepository } from '../source'
import type { PlayerId } from '../types'
import { DEMO_AUTHOR_ID } from '../types'
import { createBrowserCheer } from './browser'
import { createMemoryCheer } from './memory'
import { demoCheerSeeds, type CheerSeeds } from './seed'

const ME = { id: 'local:me', name: '나' }
const YOU = { id: 'local:you', name: '나' }
const A = 'demo:1' as PlayerId
const B = 'demo:2' as PlayerId
const DAY = 24 * 3600_000

const ds = await getDataSource('demo').load()
const seeds = demoCheerSeeds(ds)

const opened: { close?: () => void }[] = []
afterEach(() => {
  opened.splice(0).forEach((r) => r.close?.())
})

/** clock.t를 바꾸면 저장소의 "지금"이 바뀐다 */
function setup(kind: 'memory' | 'browser', s?: CheerSeeds) {
  const clock = { t: new Date(2026, 10, 7, 15, 0).getTime() }
  const now = () => clock.t
  if (kind === 'browser') {
    const indexedDB = new IDBFactory()
    const a = createBrowserCheer({ indexedDB, user: ME, seeds: s, now })
    const b = createBrowserCheer({ indexedDB, user: YOU, seeds: s, now })
    opened.push(a, b)
    return { me: a, you: b as CheerRepository, clock, indexedDB }
  }
  const a = createMemoryCheer({ user: ME, seeds: s, now })
  return { me: a, you: null, clock, indexedDB: null }
}

describe('예시 응원 (리그 기록으로 만든다)', () => {
  const slugger = ds.hitters.reduce((x, y) => (y.HR > x.HR ? y : x))

  it('선수 5명에게 메시지 8개, 홈런 1위 선수 메시지에 홈런 수가 들어간다', () => {
    expect(new Set(seeds.messages.map((m) => m.playerId)).size).toBe(5)
    expect(seeds.messages).toHaveLength(8)
    expect(seeds.messages[0]).toMatchObject({ playerId: slugger.id, text: expect.stringContaining(`홈런 ${slugger.HR}개`) })
  })

  it('응원 기록: 이번 주는 6.5일 안, 나머지는 8일 넘게 전이라 누적이 이번 주보다 크다', () => {
    const mine = seeds.cheers.filter((c) => c.playerId === slugger.id)
    expect(mine.filter((c) => c.ageMs < 6.5 * DAY)).toHaveLength(14)
    expect(mine.filter((c) => c.ageMs > 8 * DAY - 1)).toHaveLength(20)
    expect(new Set(mine.map((c) => c.userId)).size).toBe(mine.length) // 시청자 한 명은 한 번만
  })

  it('타자가 없으면 빈 값', () => {
    expect(demoCheerSeeds({ hitters: [], pitchers: [] })).toEqual({ messages: [], cheers: [] })
  })
})

describe.each(['memory', 'browser'] as const)('응원 저장소 (%s)', (kind) => {
  it('예시 응원이 처음부터 있다 (작성자는 데모, 시각은 지금 기준)', async () => {
    const { me, clock } = setup(kind, seeds)
    const s = await me.snapshot()
    expect(s.messages).toHaveLength(8)
    expect(s.messages.every((m) => m.authorId === DEMO_AUTHOR_ID)).toBe(true)
    expect(s.messages[0].createdAt).toBe(clock.t - 40 * 60_000) // 최신순
    expect(s.cheers).toHaveLength(seeds.cheers.length)
  })

  it('메시지를 쓰면 최신순 맨 위에 나오고 구독자에게 알린다', async () => {
    const { me } = setup(kind)
    const seen: number[] = []
    const off = me.subscribe((s) => seen.push(s.messages.length))
    await me.postMessage({ playerId: A, text: '화이팅', caution: false })
    await me.postMessage({ playerId: B, text: '주의 글', caution: true })
    off()
    const { messages } = await me.snapshot()
    expect(messages.map((m) => [m.text, m.authorId, m.caution])).toEqual([['주의 글', ME.id, true], ['화이팅', ME.id, false]])
    expect(seen).toEqual([1, 2])
  })

  it('「응원하기」는 선수 한 명에게 하루 1번, 다음 날 다시 누를 수 있다', async () => {
    const { me, clock } = setup(kind)
    await me.cheer(A)
    await expect(me.cheer(A)).rejects.toBeInstanceOf(AlreadyCheeredError)
    await me.cheer(B) // 다른 선수는 된다
    clock.t += DAY
    await me.cheer(A)
    const { cheers } = await me.snapshot()
    expect(cheers.filter((c) => c.playerId === A && c.userId === ME.id)).toHaveLength(2)
  })

  it('자기 메시지만 지울 수 있다', async () => {
    const { me } = setup(kind, seeds)
    const m = await me.postMessage({ playerId: A, text: '내 응원', caution: false })
    await expect(me.remove(seeds.messages[0].id)).rejects.toThrow('자기 글만')
    await me.remove(m.id)
    expect((await me.snapshot()).messages.some((x) => x.id === m.id)).toBe(false)
  })

  it('자기 메시지는 신고할 수 없고, 같은 메시지는 한 번만 신고된다', async () => {
    const { me } = setup(kind, seeds)
    const mine = await me.postMessage({ playerId: A, text: '내 응원', caution: false })
    await expect(me.report(mine.id)).rejects.toThrow('자기 글은')
    const id = seeds.messages[0].id
    await me.report(id)
    await me.report(id)
    expect((await me.snapshot()).messages.find((x) => x.id === id)!.reports).toEqual([ME.id])
  })

  it('시연 데이터 초기화: 내 메시지·응원·신고를 지우고 예시 응원을 처음 상태로', async () => {
    const { me } = setup(kind, seeds)
    await me.postMessage({ playerId: A, text: '내 응원', caution: false })
    await me.cheer(A)
    await me.report(seeds.messages[0].id)
    await me.resetDemoData!()
    const s = await me.snapshot()
    expect(s.messages).toHaveLength(8)
    expect(s.messages.every((m) => m.reports.length === 0)).toBe(true)
    expect(s.cheers).toHaveLength(seeds.cheers.length)
    await me.cheer(A) // 초기화 뒤에는 오늘 다시 응원할 수 있다
  })
})

describe('브라우저 응원 저장소', () => {
  it('다시 열어도(새로고침) 메시지·응원·신고가 남고, 예시 응원의 신고는 유지된다', async () => {
    const { me, you, indexedDB } = setup('browser', seeds)
    await me.postMessage({ playerId: A, text: '남는 응원', caution: false })
    await me.cheer(A)
    await you!.report(seeds.messages[0].id)
    const again = createBrowserCheer({ indexedDB: indexedDB!, user: ME, seeds })
    opened.push(again)
    const s = await again.snapshot()
    expect(s.messages.some((m) => m.text === '남는 응원')).toBe(true)
    expect(s.messages.find((m) => m.id === seeds.messages[0].id)!.reports).toEqual([YOU.id])
    expect(s.cheers.filter((c) => c.userId === ME.id)).toHaveLength(1)
    await expect(again.cheer(A)).rejects.toBeInstanceOf(AlreadyCheeredError)
  })

  it('다른 사용자는 내 메시지를 신고할 수 있지만 지울 수 없다', async () => {
    const { me, you } = setup('browser')
    const m = await me.postMessage({ playerId: A, text: '내 응원', caution: false })
    await you!.report(m.id)
    await expect(you!.remove(m.id)).rejects.toThrow('자기 글만')
    expect((await me.snapshot()).messages[0].reports).toEqual([YOU.id])
  })

  it('저장해 둔 사용자 id를 다시 쓴다', async () => {
    const indexedDB = new IDBFactory()
    const a = createBrowserCheer({ indexedDB })
    const b = createBrowserCheer({ indexedDB })
    opened.push(a, b)
    const u = await a.currentUser()
    expect(u!.id).toMatch(/^local:/)
    expect((await b.currentUser())!.id).toBe(u!.id)
  })
})
