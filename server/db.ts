// 서버 전용: PostgreSQL 연결. vite.config.ts(서버 쪽)에서만 불러온다. src/(브라우저 코드)에서 import하면 lint 오류.
import { readFile } from 'node:fs/promises'
import pg from 'pg'

/** 쿼리 함수. 값은 늘 $1, $2 … 자리표시자로 따로 넘긴다 (테스트에서는 가짜 구현을 넣는다) */
export type Query = <R extends Record<string, unknown> = Record<string, unknown>>(text: string, params?: readonly unknown[]) => Promise<{ rows: R[] }>

// 개발 서버 설정이 다시 불러와져도(핫 리로드) Pool이 여러 개 생기지 않게 globalThis에 둔다.
const cache = globalThis as unknown as { saberNotePool?: pg.Pool; saberNoteSchema?: Promise<void> }

function pool(databaseUrl: string): pg.Pool {
  if (!cache.saberNotePool) {
    // SSL 등 접속 옵션은 DATABASE_URL에 적힌 설정을 그대로 따른다 (코드에 따로 쓰지 않는다)
    const p = new pg.Pool({ connectionString: databaseUrl, max: 5 })
    // 유휴 연결 오류로 서버가 죽지 않게. 오류 원문에는 접속 주소가 섞일 수 있어 코드만 남긴다
    p.on('error', (err: Error & { code?: string }) => console.error(`[saber-note] DB 연결 오류 (code: ${err.code ?? 'unknown'})`))
    cache.saberNotePool = p
  }
  return cache.saberNotePool
}

/** 테이블을 처음 쓸 때 server/schema.sql을 한 번 실행한다. 실패하면 다음 요청에서 다시 시도한다 */
function ensureSchema(p: pg.Pool): Promise<void> {
  cache.saberNoteSchema ??= readFile(new URL('./schema.sql', import.meta.url), 'utf8')
    .then((sql) => p.query(sql))
    .then(() => undefined)
    .catch((e: unknown) => {
      cache.saberNoteSchema = undefined
      throw e
    })
  return cache.saberNoteSchema
}

/** DATABASE_URL로 쿼리 함수를 만든다. 첫 쿼리 전에 테이블을 준비한다 */
export function createQuery(databaseUrl: string): Query {
  const p = pool(databaseUrl)
  return async (text, params = []) => {
    await ensureSchema(p)
    const result = await p.query(text, params as unknown[])
    return { rows: result.rows }
  }
}

/** 오류 원문 대신 남길 코드 (접속 주소·비밀번호가 로그에 나오지 않게) */
export function errorCode(e: unknown): string {
  const code = (e as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code : 'unknown'
}
