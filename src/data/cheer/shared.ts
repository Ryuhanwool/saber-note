// 응원방 저장소가 지켜야 할 최소 규칙. 화면용 규칙(domain/cheer)과 같지만, data 층은 domain을 import할 수 없어서 여기 둔다.
import { AlreadyCheeredError } from '../source'
import type { CheerEvent, CheerMessage, PlayerId } from '../types'

/** 최신순. 닉네임 필드가 없던 예전 메시지는 null로 채운다 */
export const newestMessagesFirst = (ms: readonly CheerMessage[]) =>
  ms.map((m) => ({ ...m, authorName: m.authorName ?? null })).sort((a, b) => b.createdAt - a.createdAt)

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString()

/** 한 사람이 선수 한 명에게 하루(이 기기 날짜) 1번만 */
export function assertNotCheeredToday(cheers: readonly CheerEvent[], playerId: PlayerId, userId: string, now: number) {
  if (cheers.some((c) => c.playerId === playerId && c.userId === userId && sameDay(c.createdAt, now))) throw new AlreadyCheeredError()
}

export const findMessage = (ms: readonly CheerMessage[], id: string) => {
  const m = ms.find((x) => x.id === id)
  if (!m) throw new Error('응원 메시지를 찾을 수 없습니다.')
  return m
}
