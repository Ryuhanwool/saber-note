// 서버 응원 저장소: 응원 메시지와 「응원하기」 기록을 서버(/api/cheer → PostgreSQL)에 저장해 모두에게 보인다.
// DB 접속은 서버(server/)만 한다. 이 파일은 fetch로 API를 부를 뿐 DB 주소를 모른다.
// 예시 응원은 지금처럼 코드에서 만들어 서버 기록과 합친다 (DB에는 실제 사용자 기록만 저장).
import { AlreadyCheeredError, type CheerRepository } from '../source'
import type { CheerEvent, CheerMessage, CheerSnapshot } from '../types'
import { requireUser, reportedBy, assertAuthor } from '../community/shared'
import { EMPTY_CHEER_SEEDS, seedToCheer, seedToMessage, type CheerSeeds } from './seed'
import { findMessage, newestMessagesFirst } from './shared'

export type ApiCheerOptions = {
  /** 로그인한 계정. null이면 로그아웃 상태(읽기만) */
  user: { id: string; name: string } | null
  seeds?: CheerSeeds
  /** 기본은 전역 fetch (테스트에서 가짜를 넣는다) */
  fetch?: typeof fetch
  /** 기본은 '' (같은 주소의 /api) */
  baseUrl?: string
  now?: () => number
}

/** 서버가 준 오류 안내 (없으면 일반 안내) */
async function failure(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null
  return new Error(typeof body?.error === 'string' ? body.error : '서버에 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.')
}

/** 서버 저장소를 쓸 수 있는지 (DATABASE_URL이 있고 DB에 닿는지). 시간 안에 답이 없으면 false */
export async function cheerApiAvailable(opts: { fetch?: typeof fetch; baseUrl?: string; timeoutMs?: number } = {}): Promise<boolean> {
  const f = opts.fetch ?? globalThis.fetch
  if (typeof f !== 'function') return false
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), opts.timeoutMs ?? 4000) : null
  try {
    const res = await f(`${opts.baseUrl ?? ''}/api/health`, { signal: controller?.signal, cache: 'no-store' })
    if (!res.ok) return false
    const body = (await res.json().catch(() => null)) as { ok?: unknown } | null
    return body?.ok === true
  } catch {
    return false
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function createApiCheer(opts: ApiCheerOptions): CheerRepository {
  const f = opts.fetch ?? globalThis.fetch.bind(globalThis)
  const base = opts.baseUrl ?? ''
  const seeds = opts.seeds ?? EMPTY_CHEER_SEEDS
  const now = opts.now ?? Date.now
  const user = opts.user
  const listeners = new Set<(s: CheerSnapshot) => void>()
  /** 예시 메시지(DB에 없음)에 단 신고는 이 화면에서만 기억한다 */
  let seedReports = new Map<string, string[]>()
  const isSeed = (id: string) => seeds.messages.some((m) => m.id === id)

  const call = async (method: string, path: string, body?: unknown) => {
    const res = await f(`${base}${path}`, {
      method,
      cache: 'no-store',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return res
  }

  async function snapshot(): Promise<CheerSnapshot> {
    const res = await call('GET', '/api/cheer')
    if (!res.ok) throw await failure(res)
    const data = (await res.json()) as { messages: CheerMessage[]; cheers: CheerEvent[] }
    const t = now()
    const seedMessages = seeds.messages.map((s) => {
      const m = seedToMessage(s, t)
      return { ...m, reports: seedReports.get(m.id) ?? [] }
    })
    return {
      messages: newestMessagesFirst([...data.messages, ...seedMessages]),
      cheers: [...seeds.cheers.map((c) => seedToCheer(c, t)), ...data.cheers],
    }
  }

  async function notify() {
    if (listeners.size === 0) return
    const s = await snapshot()
    listeners.forEach((l) => l(s))
  }

  return {
    storage: 'shared',
    async currentUser() {
      return user
    },
    snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async postMessage(input) {
      const me = requireUser(user)
      const res = await call('POST', '/api/cheer/messages', { playerId: input.playerId, text: input.text, caution: input.caution, authorId: me.id, authorName: me.name })
      if (!res.ok) throw await failure(res)
      const m = (await res.json()) as CheerMessage
      await notify()
      return m
    },
    async cheer(playerId) {
      const me = requireUser(user)
      const res = await call('POST', '/api/cheer/events', { playerId, userId: me.id })
      if (res.status === 409) throw new AlreadyCheeredError()
      if (!res.ok) throw await failure(res)
      await notify()
    },
    async report(id) {
      const me = requireUser(user)
      if (isSeed(id)) {
        const s = await snapshot()
        seedReports = new Map(seedReports).set(id, reportedBy(findMessage(s.messages, id), me.id))
      } else {
        const res = await call('POST', `/api/cheer/messages/${encodeURIComponent(id)}/report`, { userId: me.id })
        if (!res.ok) throw await failure(res)
      }
      await notify()
    },
    async remove(id) {
      const me = requireUser(user)
      if (isSeed(id)) assertAuthor(findMessage((await snapshot()).messages, id), me.id)
      const res = await call('DELETE', `/api/cheer/messages/${encodeURIComponent(id)}`, { userId: me.id })
      if (!res.ok) throw await failure(res)
      await notify()
    },
    /** 시연 데이터 초기화: 서버에서는 내 메시지·응원·신고만 지운다 (다른 사람 기록은 그대로) */
    async resetDemoData() {
      seedReports = new Map()
      if (user) {
        const res = await call('POST', '/api/cheer/reset', { userId: user.id })
        if (!res.ok) throw await failure(res)
      }
      await notify()
    },
  }
}
