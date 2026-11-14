import { describe, expect, it } from 'vitest'
import { AlreadyCheeredError } from '../source'
import { cheerApiAvailable, createApiCheer } from './api'
import type { CheerSeeds } from './seed'

type Sent = { method: string; url: string; body: unknown }

/** 경로별로 정한 응답을 돌려주고 보낸 요청을 기록하는 가짜 fetch */
function fakeFetch(routes: Record<string, (body: unknown) => { status: number; body?: unknown }>) {
  const sent: Sent[] = []
  const f = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    sent.push({ method, url, body })
    const handler = routes[`${method} ${url}`]
    const r = handler ? handler(body) : { status: 404, body: { error: '없는 주소입니다.' } }
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status })
  }) as typeof fetch
  return { f, sent }
}

const NOW = Date.parse('2026-11-14T03:00:00Z')
const me = { id: 'acc-1', name: '체험팬' }
const serverMessage = { id: '6f1c1c7e-2b7a-4c39-9d7e-0d9a3a1b2c3d', playerId: 'demo:1', authorId: 'acc-2', authorName: '다른팬', text: '서버 응원', createdAt: NOW - 1000, reports: [], caution: false }
const seeds: CheerSeeds = {
  messages: [{ id: 'demo-cheer-msg-1', playerId: 'demo:1', text: '예시 응원', caution: false, ageMs: 60_000 }],
  cheers: [{ id: 'demo-cheer-1', playerId: 'demo:1', userId: 'viewer-1', ageMs: 60_000 }],
}
const list = () => ({ status: 200, body: { messages: [serverMessage], cheers: [{ id: 'ev-1', playerId: 'demo:1', userId: 'acc-2', createdAt: NOW - 500 }] } })

describe('서버 응원 저장소', () => {
  it('서버 기록과 예시 응원을 합쳐 최신순으로 보여 준다', async () => {
    const { f } = fakeFetch({ 'GET /api/cheer': list })
    const repo = createApiCheer({ user: me, seeds, fetch: f, now: () => NOW })
    expect(repo.storage).toBe('shared')
    const s = await repo.snapshot()
    expect(s.messages.map((m) => m.id)).toEqual([serverMessage.id, 'demo-cheer-msg-1'])
    expect(s.cheers.map((c) => c.id).sort()).toEqual(['demo-cheer-1', 'ev-1'])
  })

  it('메시지를 쓰면 로그인한 계정을 작성자로 보내고, 구독자에게 새 상태를 준다', async () => {
    const { f, sent } = fakeFetch({ 'GET /api/cheer': list, 'POST /api/cheer/messages': () => ({ status: 201, body: serverMessage }) })
    const repo = createApiCheer({ user: me, fetch: f, now: () => NOW })
    let seen = 0
    repo.subscribe(() => seen++)
    await repo.postMessage({ playerId: 'demo:1', text: '화이팅', caution: false })
    expect(sent.find((s) => s.method === 'POST')?.body).toEqual({ playerId: 'demo:1', text: '화이팅', caution: false, authorId: 'acc-1', authorName: '체험팬' })
    expect(seen).toBe(1)
  })

  it('로그아웃 상태에서는 쓰지 못한다', async () => {
    const { f, sent } = fakeFetch({})
    const repo = createApiCheer({ user: null, fetch: f })
    await expect(repo.postMessage({ playerId: 'demo:1', text: '화이팅', caution: false })).rejects.toThrow('로그인이 필요합니다.')
    expect(sent).toHaveLength(0)
  })

  it('오늘 이미 응원했으면(409) AlreadyCheeredError', async () => {
    const { f } = fakeFetch({ 'POST /api/cheer/events': () => ({ status: 409, body: { error: '오늘은 이미 이 선수를 응원했습니다.' } }) })
    const repo = createApiCheer({ user: me, fetch: f })
    await expect(repo.cheer('demo:1')).rejects.toBeInstanceOf(AlreadyCheeredError)
  })

  it('서버 저장이 실패하면 서버 안내로 오류를 낸다 (화면은 「반영하지 못했어요」 등으로 처리)', async () => {
    const { f } = fakeFetch({ 'POST /api/cheer/messages': () => ({ status: 503, body: { error: '서버에 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.' } }) })
    const repo = createApiCheer({ user: me, fetch: f })
    await expect(repo.postMessage({ playerId: 'demo:1', text: '화이팅', caution: false })).rejects.toThrow('서버에 저장하지 못했어요')
  })

  it('예시 메시지 신고는 서버로 보내지 않고 이 화면에서만 기억한다', async () => {
    const { f, sent } = fakeFetch({ 'GET /api/cheer': list })
    const repo = createApiCheer({ user: me, seeds, fetch: f, now: () => NOW })
    await repo.report('demo-cheer-msg-1')
    expect(sent.some((s) => s.url.includes('/report'))).toBe(false)
    const s = await repo.snapshot()
    expect(s.messages.find((m) => m.id === 'demo-cheer-msg-1')?.reports).toEqual(['acc-1'])
  })

  it('시연 데이터 초기화는 내 id로 서버의 내 기록만 지우게 요청한다', async () => {
    const { f, sent } = fakeFetch({ 'POST /api/cheer/reset': () => ({ status: 200, body: { ok: true } }) })
    const repo = createApiCheer({ user: me, fetch: f })
    await repo.resetDemoData?.()
    expect(sent).toEqual([{ method: 'POST', url: '/api/cheer/reset', body: { userId: 'acc-1' } }])
  })
})

describe('서버 저장소를 쓸 수 있는지', () => {
  it('/api/health가 ok면 true', async () => {
    const { f } = fakeFetch({ 'GET /api/health': () => ({ status: 200, body: { ok: true } }) })
    expect(await cheerApiAvailable({ fetch: f })).toBe(true)
  })

  it('503(DATABASE_URL 없음)·404(정적 호스팅)·네트워크 오류면 false', async () => {
    expect(await cheerApiAvailable({ fetch: fakeFetch({ 'GET /api/health': () => ({ status: 503 }) }).f })).toBe(false)
    expect(await cheerApiAvailable({ fetch: fakeFetch({}).f })).toBe(false)
    expect(await cheerApiAvailable({ fetch: (async () => { throw new TypeError('network') }) as typeof fetch })).toBe(false)
  })
})
