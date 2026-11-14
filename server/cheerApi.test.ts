import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MESSAGE_LIMIT, cheerApiMiddleware } from './cheerApi.ts'
import type { Query } from './db.ts'

type Call = { text: string; params: readonly unknown[] }

/** 쿼리를 기록하고, 정한 순서대로 행을 돌려주는 가짜 DB */
function fakeDb(...results: Array<Record<string, unknown>[] | Error>) {
  const calls: Call[] = []
  const query = (async (text: string, params: readonly unknown[] = []) => {
    calls.push({ text, params })
    const next = results.shift() ?? []
    if (next instanceof Error) throw next
    return { rows: next }
  }) as Query
  return { query, calls }
}

async function request(query: Query | null, method: string, url: string, body?: unknown) {
  const raw = body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]
  const req = Object.assign(Readable.from(raw), { method, url }) as unknown as IncomingMessage
  const headers: Record<string, string> = {}
  let status = 0
  let text = ''
  let nextCalled = false
  await new Promise<void>((resolve) => {
    const res = {
      set statusCode(v: number) { status = v },
      setHeader: (k: string, v: string) => { headers[k.toLowerCase()] = v },
      end: (b: string) => { text = b; resolve() },
    } as unknown as ServerResponse
    cheerApiMiddleware(query)(req, res, () => { nextCalled = true; resolve() })
  })
  return { status, headers, json: text ? JSON.parse(text) : null, nextCalled }
}

const MESSAGE_ID = '6f1c1c7e-2b7a-4c39-9d7e-0d9a3a1b2c3d'
const row = { id: MESSAGE_ID, player_id: 'demo:1', author_id: 'u1', author_name: '체험팬', text: '화이팅', caution: false, created_at: new Date('2026-11-14T03:00:00Z'), reports: [] }

afterEach(() => vi.restoreAllMocks())

describe('응원방 API', () => {
  it('다른 주소는 다음 미들웨어(Vite)로 넘긴다', async () => {
    const r = await request(fakeDb().query, 'GET', '/index.html')
    expect(r.nextCalled).toBe(true)
  })

  it('DATABASE_URL이 없으면 503 (브라우저 저장으로 돌아가게)', async () => {
    expect((await request(null, 'GET', '/api/health')).status).toBe(503)
    expect((await request(null, 'GET', '/api/cheer')).status).toBe(503)
  })

  it('GET /api/cheer는 최근 메시지 50개만, 값은 자리표시자로 넘긴다', async () => {
    const db = fakeDb([row], [{ id: '7', player_id: 'demo:1', user_id: 'u2', created_at: new Date('2026-11-14T04:00:00Z') }])
    const r = await request(db.query, 'GET', '/api/cheer')
    expect(r.status).toBe(200)
    expect(r.headers['cache-control']).toBe('no-store')
    expect(r.json.messages).toEqual([{ id: MESSAGE_ID, playerId: 'demo:1', authorId: 'u1', authorName: '체험팬', text: '화이팅', createdAt: Date.parse('2026-11-14T03:00:00Z'), reports: [], caution: false }])
    expect(r.json.cheers).toEqual([{ id: 'ev-7', playerId: 'demo:1', userId: 'u2', createdAt: Date.parse('2026-11-14T04:00:00Z') }])
    expect(db.calls[0].text).toMatch(/LIMIT \$1/)
    expect(db.calls[0].params).toEqual([MESSAGE_LIMIT])
    expect(MESSAGE_LIMIT).toBe(50)
  })

  it('메시지를 저장한다: 본문은 SQL 문자열에 넣지 않고 따로 넘긴다', async () => {
    const db = fakeDb([row])
    const text = "화이팅'); DROP TABLE cheer_messages; --"
    const r = await request(db.query, 'POST', '/api/cheer/messages', { playerId: 'demo:1', text, caution: false, authorId: 'u1', authorName: '체험팬' })
    expect(r.status).toBe(201)
    expect(db.calls[0].text).not.toContain(text)
    expect(db.calls[0].params).toEqual(['demo:1', 'u1', '체험팬', text, false])
  })

  it.each([
    ['빈 값', ''],
    ['공백만', '   '],
    ['201자', '가'.repeat(201)],
    ['문자열이 아님', 123],
  ])('메시지 검사: %s이면 400이고 DB를 부르지 않는다', async (_label, text) => {
    const db = fakeDb()
    const r = await request(db.query, 'POST', '/api/cheer/messages', { playerId: 'demo:1', text, caution: false, authorId: 'u1', authorName: null })
    expect(r.status).toBe(400)
    expect(db.calls).toHaveLength(0)
  })

  it('200자는 저장된다', async () => {
    const db = fakeDb([row])
    const r = await request(db.query, 'POST', '/api/cheer/messages', { playerId: 'demo:1', text: '가'.repeat(200), caution: false, authorId: 'u1', authorName: null })
    expect(r.status).toBe(201)
  })

  it('JSON이 아니면 400', async () => {
    const r = await request(fakeDb().query, 'POST', '/api/cheer/messages', '{oops')
    expect(r.status).toBe(400)
  })

  it('응원하기: 오늘 이미 응원했으면(충돌로 아무 행도 안 들어가면) 409', async () => {
    const db = fakeDb([])
    const r = await request(db.query, 'POST', '/api/cheer/events', { playerId: 'demo:1', userId: 'u1' })
    expect(r.status).toBe(409)
    expect(db.calls[0].text).toMatch(/ON CONFLICT \(player_id, user_id, cheer_date\) DO NOTHING/)
  })

  it('자기 메시지는 신고할 수 없다 (403)', async () => {
    const db = fakeDb([{ author_id: 'u1' }])
    const r = await request(db.query, 'POST', `/api/cheer/messages/${MESSAGE_ID}/report`, { userId: 'u1' })
    expect(r.status).toBe(403)
    expect(db.calls).toHaveLength(1)
  })

  it('남의 메시지는 지울 수 없다 (403)', async () => {
    const db = fakeDb([{ author_id: 'u1' }])
    const r = await request(db.query, 'DELETE', `/api/cheer/messages/${MESSAGE_ID}`, { userId: 'u2' })
    expect(r.status).toBe(403)
  })

  it('UUID가 아닌 메시지 id는 DB를 부르지 않고 404', async () => {
    const db = fakeDb()
    const r = await request(db.query, 'DELETE', '/api/cheer/messages/demo-cheer-msg-1', { userId: 'u1' })
    expect(r.status).toBe(404)
    expect(db.calls).toHaveLength(0)
  })

  it('시연 데이터 초기화는 내 기록만 지운다', async () => {
    const db = fakeDb([], [], [])
    const r = await request(db.query, 'POST', '/api/cheer/reset', { userId: 'u1' })
    expect(r.status).toBe(200)
    expect(db.calls.map((c) => c.params)).toEqual([['u1'], ['u1'], ['u1']])
    expect(db.calls.every((c) => /WHERE (user_id|author_id) = \$1$/.test(c.text))).toBe(true)
  })

  it('DB 오류: 503과 일반 안내만 주고, 로그에는 오류 원문(접속 주소가 섞일 수 있음) 대신 코드만 남긴다', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const secret = 'postgresql://user:pw@db.example.com:5432/postgres'
    const db = fakeDb(Object.assign(new Error(`connect failed ${secret}`), { code: 'ECONNREFUSED' }))
    const r = await request(db.query, 'GET', '/api/health')
    expect(r.status).toBe(503)
    expect(JSON.stringify(r.json)).not.toContain('example.com')
    const logged = log.mock.calls.flat().join(' ')
    expect(logged).toContain('ECONNREFUSED')
    expect(logged).not.toContain('example.com')
  })
})
