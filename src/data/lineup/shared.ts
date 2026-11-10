import type { LineupDraft, SavedLineup } from '../types'

/** 저장할 라인업 (모양만 복사해 둔다. 자리·타순 규칙은 domain이 저장 전에 검사한다) */
export const toSaved = (accountId: string, l: LineupDraft, now: number): SavedLineup =>
  ({ accountId, slots: { ...l.slots }, order: [...l.order], updatedAt: now })
