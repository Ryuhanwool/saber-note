// 서버 전용: 선수 응원방 API. Vite 개발 서버(npm run dev)와 미리 보기 서버(npm run preview)에 미들웨어로 붙는다.
//
//   GET    /api/health                      DB를 쓸 수 있는지 (테이블 준비 포함)
//   GET    /api/cheer                       최근 메시지 50개와 최근 「응원하기」 기록
//   POST   /api/cheer/messages              { playerId, text, caution, authorId, authorName }
//   POST   /api/cheer/events                { playerId, userId }            오늘 이미 응원했으면 409
//   POST   /api/cheer/messages/:id/report   { userId }                      자기 메시지면 403
//   DELETE /api/cheer/messages/:id          { userId }                      남의 메시지면 403
//   POST   /api/cheer/reset                 { userId }                      내 메시지·응원·신고만 지운다
//
// 시연용이라 사용자 확인이 없다: 계정은 브라우저에만 있고, 서버는 요청에 담긴 사용자 id를 믿는다.
// 공개 서비스로 쓰려면 Supabase Auth 같은 실제 인증이 필요하다 (README 참고).
import type { IncomingMessage, ServerResponse } from 'node:http'
import { errorCode, type Query } from './db.ts'

export const MESSAGE_LIMIT = 50
/** 누적·이번 주 응원 수를 계산할 「응원하기」 기록 수 상한 (시연 규모에서는 전부 들어온다) */
export const EVENT_LIMIT = 5000
export const MAX_TEXT_LENGTH = 200
const MAX_BODY_BYTES = 16 * 1024
const MAX_ID_LENGTH = 128
const MAX_PLAYER_ID_LENGTH = 64
const MAX_NAME_LENGTH = 40
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Next = (err?: unknown) => void
export type Middleware = (req: IncomingMessage, res: ServerResponse, next: Next) => void

class HttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY_BYTES) throw new HttpError(413, '요청이 너무 큽니다.')
    chunks.push(chunk as Buffer)
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>
  } catch {
    // 아래에서 400
  }
  throw new HttpError(400, '요청 형식이 올바르지 않습니다.')
}

function str(body: Record<string, unknown>, key: string, max: number): string {
  const v = body[key]
  if (typeof v !== 'string' || v.trim() === '' || v.length > max) throw new HttpError(400, `${key} 값이 올바르지 않습니다.`)
  return v
}

/** 메시지 본문: 빈 값과 200자 초과는 서버에서도 막는다 */
function messageText(body: Record<string, unknown>): string {
  const v = body.text
  if (typeof v !== 'string' || v.trim() === '') throw new HttpError(400, '응원 메시지를 입력해 주세요.')
  if (v.length > MAX_TEXT_LENGTH) throw new HttpError(400, `응원 메시지는 ${MAX_TEXT_LENGTH}자까지 쓸 수 있어요.`)
  return v
}

function messageId(raw: string): string {
  const id = decodeURIComponent(raw)
  if (!UUID.test(id)) throw new HttpError(404, '응원 메시지를 찾을 수 없습니다.')
  return id
}

type MessageRow = { id: string; player_id: string; author_id: string; author_name: string | null; text: string; caution: boolean; created_at: Date; reports: string[] }
type EventRow = { id: string; player_id: string; user_id: string; created_at: Date }

const toMessage = (r: MessageRow) => ({
  id: r.id, playerId: r.player_id, authorId: r.author_id, authorName: r.author_name, text: r.text,
  createdAt: new Date(r.created_at).getTime(), reports: r.reports ?? [], caution: r.caution,
})
const toEvent = (r: EventRow) => ({ id: `ev-${r.id}`, playerId: r.player_id, userId: r.user_id, createdAt: new Date(r.created_at).getTime() })

const SELECT_MESSAGES = `
  SELECT m.id, m.player_id, m.author_id, m.author_name, m.text, m.caution, m.created_at,
         COALESCE(array_agg(r.user_id ORDER BY r.created_at) FILTER (WHERE r.user_id IS NOT NULL), '{}') AS reports
    FROM cheer_messages m
    LEFT JOIN cheer_reports r ON r.message_id = m.id`

async function handle(query: Query, method: string, path: string, req: IncomingMessage) {
  if (method === 'GET' && path === '/api/health') {
    await query('SELECT 1')
    return { status: 200, body: { ok: true } }
  }

  if (method === 'GET' && path === '/api/cheer') {
    const [messages, events] = await Promise.all([
      query<MessageRow>(`${SELECT_MESSAGES} GROUP BY m.id ORDER BY m.created_at DESC, m.id DESC LIMIT $1`, [MESSAGE_LIMIT]),
      query<EventRow>('SELECT id, player_id, user_id, created_at FROM cheer_events ORDER BY created_at DESC, id DESC LIMIT $1', [EVENT_LIMIT]),
    ])
    return { status: 200, body: { messages: messages.rows.map(toMessage), cheers: events.rows.map(toEvent) } }
  }

  if (method === 'POST' && path === '/api/cheer/messages') {
    const body = await readJson(req)
    const text = messageText(body)
    const playerId = str(body, 'playerId', MAX_PLAYER_ID_LENGTH)
    const authorId = str(body, 'authorId', MAX_ID_LENGTH)
    const authorName = body.authorName == null ? null : str(body, 'authorName', MAX_NAME_LENGTH)
    const caution = body.caution === true
    const { rows } = await query<MessageRow>(
      `INSERT INTO cheer_messages (player_id, author_id, author_name, text, caution)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, player_id, author_id, author_name, text, caution, created_at, '{}'::text[] AS reports`,
      [playerId, authorId, authorName, text, caution],
    )
    return { status: 201, body: toMessage(rows[0]) }
  }

  if (method === 'POST' && path === '/api/cheer/events') {
    const body = await readJson(req)
    const playerId = str(body, 'playerId', MAX_PLAYER_ID_LENGTH)
    const userId = str(body, 'userId', MAX_ID_LENGTH)
    const { rows } = await query<EventRow>(
      `INSERT INTO cheer_events (player_id, user_id) VALUES ($1, $2)
       ON CONFLICT (player_id, user_id, cheer_date) DO NOTHING
       RETURNING id, player_id, user_id, created_at`,
      [playerId, userId],
    )
    if (rows.length === 0) throw new HttpError(409, '오늘은 이미 이 선수를 응원했습니다.')
    return { status: 201, body: toEvent(rows[0]) }
  }

  if (method === 'POST' && path === '/api/cheer/reset') {
    const body = await readJson(req)
    const userId = str(body, 'userId', MAX_ID_LENGTH)
    // 내 기록만 지운다 (내 메시지에 달린 신고는 메시지와 함께 지워진다)
    await query('DELETE FROM cheer_reports WHERE user_id = $1', [userId])
    await query('DELETE FROM cheer_messages WHERE author_id = $1', [userId])
    await query('DELETE FROM cheer_events WHERE user_id = $1', [userId])
    return { status: 200, body: { ok: true } }
  }

  const report = /^\/api\/cheer\/messages\/([^/]+)\/report$/.exec(path)
  if (method === 'POST' && report) {
    const id = messageId(report[1])
    const userId = str(await readJson(req), 'userId', MAX_ID_LENGTH)
    const { rows } = await query<{ author_id: string }>('SELECT author_id FROM cheer_messages WHERE id = $1', [id])
    if (rows.length === 0) throw new HttpError(404, '응원 메시지를 찾을 수 없습니다.')
    if (rows[0].author_id === userId) throw new HttpError(403, '자기 글은 신고할 수 없습니다.')
    await query('INSERT INTO cheer_reports (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, userId])
    return { status: 200, body: { ok: true } }
  }

  const message = /^\/api\/cheer\/messages\/([^/]+)$/.exec(path)
  if (method === 'DELETE' && message) {
    const id = messageId(message[1])
    const userId = str(await readJson(req), 'userId', MAX_ID_LENGTH)
    const { rows } = await query<{ author_id: string }>('SELECT author_id FROM cheer_messages WHERE id = $1', [id])
    if (rows.length === 0) throw new HttpError(404, '응원 메시지를 찾을 수 없습니다.')
    if (rows[0].author_id !== userId) throw new HttpError(403, '자기 글만 지울 수 있습니다.')
    await query('DELETE FROM cheer_messages WHERE id = $1 AND author_id = $2', [id, userId])
    return { status: 200, body: { ok: true } }
  }

  return null
}

/**
 * 응원방 API 미들웨어. query가 null이면(DATABASE_URL 없음) /api/health·/api/cheer는 503을 돌려주고,
 * 브라우저는 지금처럼 이 브라우저에만 저장하는 방식으로 돌아간다.
 */
export function cheerApiMiddleware(query: Query | null): Middleware {
  return (req, res, next) => {
    const url = req.url ?? ''
    const path = url.split('?')[0]
    if (path !== '/api/health' && !path.startsWith('/api/cheer')) return next()
    if (!query) return send(res, 503, { error: '서버 저장소가 설정되지 않았습니다.' })
    handle(query, req.method ?? 'GET', path, req)
      .then((result) => (result ? send(res, result.status, result.body) : send(res, 404, { error: '없는 주소입니다.' })))
      .catch((e: unknown) => {
        if (e instanceof HttpError) return send(res, e.status, { error: e.message })
        // DB 오류 원문에는 접속 주소가 섞일 수 있어 일반 메시지와 코드만 남긴다
        console.error(`[saber-note] 응원방 API 실패: ${req.method} ${path} (code: ${errorCode(e)})`)
        send(res, 503, { error: '서버에 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.' })
      })
  }
}
