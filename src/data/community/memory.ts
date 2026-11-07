// 메모리 저장소: 새로고침하면 사라진다. IndexedDB를 쓸 수 없는 브라우저의 대체와 테스트용.
import type { CommunityRepository } from '../source'
import type { CommunityPost, CommunityUser, MediaRef } from '../types'
import { assertAuthor, newestFirst, newId, reportedBy, toggledLikes } from './shared'

export function createMemoryCommunity(opts: { user?: CommunityUser; posts?: CommunityPost[] } = {}): CommunityRepository {
  const user = opts.user ?? { id: `local:${newId()}`, name: '나' }
  let posts = [...(opts.posts ?? [])]
  const blobs = new Map<string, Blob>()
  const urls = new Map<string, string>()
  const listeners = new Set<(p: CommunityPost[]) => void>()
  const emit = () => listeners.forEach((l) => l(newestFirst(posts)))
  const find = (id: string) => {
    const p = posts.find((x) => x.id === id)
    if (!p) throw new Error('글을 찾을 수 없습니다.')
    return p
  }
  const replace = (next: CommunityPost) => {
    posts = posts.map((x) => (x.id === next.id ? next : x))
    emit()
  }

  return {
    storage: 'memory',
    async currentUser() {
      return user
    },
    async list() {
      return newestFirst(posts)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async create(input) {
      const media: MediaRef[] = input.files.map((f) => {
        const id = newId()
        blobs.set(id, f.blob)
        return { id, kind: f.kind, type: f.blob.type, name: f.name }
      })
      const post: CommunityPost = {
        id: newId(), authorId: user.id, text: input.text, players: input.players, media,
        createdAt: Date.now(), likes: [], reports: [], masked: input.masked,
      }
      posts = [post, ...posts]
      emit()
      return post
    },
    async toggleLike(id) {
      const p = find(id)
      replace({ ...p, likes: toggledLikes(p, user.id) })
    },
    async report(id) {
      const p = find(id)
      replace({ ...p, reports: reportedBy(p, user.id) })
    },
    async remove(id) {
      const p = find(id)
      assertAuthor(p, user.id)
      for (const m of p.media) {
        blobs.delete(m.id)
        const url = urls.get(m.id)
        if (url) URL.revokeObjectURL(url)
        urls.delete(m.id)
      }
      posts = posts.filter((x) => x.id !== id)
      emit()
    },
    async mediaUrl(ref) {
      const blob = blobs.get(ref.id)
      if (!blob || typeof URL.createObjectURL !== 'function') return null
      if (!urls.has(ref.id)) urls.set(ref.id, URL.createObjectURL(blob))
      return urls.get(ref.id)!
    },
  }
}
