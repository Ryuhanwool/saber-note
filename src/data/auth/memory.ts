// 메모리 계정 저장소: 새로고침하면 사라진다. IndexedDB를 쓸 수 없는 브라우저의 대체와 테스트용.
import { newId } from '../community/shared'
import { NicknameTakenError, WrongCredentialsError, type AuthRepository } from '../source'
import { DEMO_ACCOUNT_ID, type Account } from '../types'
import { availableSubtle, demoRecord, newRecord, nicknameKey, passwordMatches, toAccount, type AccountRecord } from './shared'

export type AuthOptions = {
  /** 기본은 이 접속의 Web Crypto (null이면 쓸 수 없는 접속을 흉내 낸다) */
  subtle?: SubtleCrypto | null
  /** 해시 반복 횟수 (테스트에서 줄인다) */
  iterations?: number
  now?: () => number
}

export function createMemoryAuth(opts: AuthOptions & { signedIn?: Account | null } = {}): AuthRepository {
  const subtle = opts.subtle === undefined ? availableSubtle() : opts.subtle
  const now = opts.now ?? Date.now
  let records: AccountRecord[] = [demoRecord()]
  let session: string | null = opts.signedIn?.id ?? null
  if (opts.signedIn && opts.signedIn.id !== DEMO_ACCOUNT_ID) records.push({ ...opts.signedIn, key: nicknameKey(opts.signedIn.nickname), hash: null, salt: null, iterations: 0 })
  const listeners = new Set<(a: Account | null) => void>()
  const current = () => {
    const r = records.find((x) => x.id === session)
    return r ? toAccount(r) : null
  }
  const setSession = (id: string | null) => {
    session = id
    const a = current()
    listeners.forEach((l) => l(a))
    return a
  }

  return {
    storage: 'memory',
    cryptoAvailable: subtle !== null,
    async current() {
      return current()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async nicknames() {
      return records.map((r) => r.nickname)
    },
    async signUp(input) {
      const r = await newRecord(subtle, `acct:${newId()}`, input.nickname, input.password, input.team, now(), opts.iterations)
      if (records.some((x) => x.key === r.key)) throw new NicknameTakenError()
      records = [...records, r]
      return setSession(r.id)!
    },
    async signIn(nickname, password) {
      const r = records.find((x) => x.key === nicknameKey(nickname))
      if (!r || !(await passwordMatches(subtle, r, password))) throw new WrongCredentialsError()
      return setSession(r.id)!
    },
    async signInDemo() {
      return setSession(DEMO_ACCOUNT_ID)!
    },
    async signOut() {
      setSession(null)
    },
    async resetDemoData({ accounts }) {
      if (!accounts) return
      records = [demoRecord()]
      setSession(null)
    },
  }
}
