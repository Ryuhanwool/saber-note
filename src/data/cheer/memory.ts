// 메모리 응원 저장소: 새로고침하면 사라진다. IndexedDB를 쓸 수 없는 브라우저의 대체와 테스트용.
import { assertAuthor, newId, reportedBy, requireUser, type RepoUser } from '../community/shared'
import type { CheerRepository } from '../source'
import type { CheerEvent, CheerMessage, CheerSnapshot, CommunityUser } from '../types'
import { EMPTY_CHEER_SEEDS, seedToCheer, seedToMessage, type CheerSeeds } from './seed'
import { assertNotCheeredToday, findMessage, newestMessagesFirst } from './shared'

export function createMemoryCheer(opts: { user?: RepoUser; seeds?: CheerSeeds; now?: () => number } = {}): CheerRepository {
  const user: CommunityUser | null = opts.user === undefined ? { id: `local:${newId()}`, name: '나' } : opts.user
  const seeds = opts.seeds ?? EMPTY_CHEER_SEEDS
  const now = opts.now ?? Date.now
  let messages: CheerMessage[] = []
  let cheers: CheerEvent[] = []
  const fill = () => {
    const t = now()
    messages = seeds.messages.map((s) => seedToMessage(s, t))
    cheers = seeds.cheers.map((s) => seedToCheer(s, t))
  }
  fill()
  const listeners = new Set<(s: CheerSnapshot) => void>()
  const snap = (): CheerSnapshot => ({ messages: newestMessagesFirst(messages), cheers: [...cheers] })
  const emit = () => listeners.forEach((l) => l(snap()))

  return {
    storage: 'memory',
    async currentUser() {
      return user
    },
    async snapshot() {
      return snap()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async postMessage(input) {
      const me = requireUser(user)
      const m: CheerMessage = { id: newId(), playerId: input.playerId, authorId: me.id, authorName: me.name, text: input.text, createdAt: now(), reports: [], caution: input.caution }
      messages = [m, ...messages]
      emit()
      return m
    },
    async cheer(playerId) {
      const t = now()
      const me = requireUser(user)
      assertNotCheeredToday(cheers, playerId, me.id, t)
      cheers = [...cheers, { id: newId(), playerId, userId: me.id, createdAt: t }]
      emit()
    },
    async report(id) {
      const m = findMessage(messages, id)
      messages = messages.map((x) => (x.id === id ? { ...m, reports: reportedBy(m, requireUser(user).id) } : x))
      emit()
    },
    async remove(id) {
      assertAuthor(findMessage(messages, id), requireUser(user).id)
      messages = messages.filter((x) => x.id !== id)
      emit()
    },
    async resetDemoData() {
      fill()
      emit()
    },
  }
}
