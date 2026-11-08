// 계정 저장소 공통: 비밀번호 해시(Web Crypto PBKDF2-SHA256), 저장 레코드, 데모 계정.
// 시연용이다. 이 브라우저 안에 해시를 두는 방식은 실제 서비스의 보안 수준이 아니다.
import { CryptoUnavailableError } from '../source'
import { DEMO_ACCOUNT_ID, DEMO_ACCOUNT_NICKNAME, type Account } from '../types'

export const PBKDF2_ITERATIONS = 100_000

/** 저장 레코드: 계정 + 중복 비교 키 + 비밀번호 해시 (데모 계정은 해시가 없어 비밀번호로는 로그인할 수 없다) */
export type AccountRecord = Account & { key: string; hash: string | null; salt: string | null; iterations: number }

/** 중복 비교용 키 (domain/auth의 nicknameKey와 같다. data 층은 domain을 import할 수 없어 여기 둔다) */
export const nicknameKey = (nickname: string) => nickname.replace(/\s+/g, '').toLowerCase()

export const toAccount = ({ id, nickname, team, createdAt }: AccountRecord): Account => ({ id, nickname, team, createdAt })

export const demoRecord = (): AccountRecord => ({
  id: DEMO_ACCOUNT_ID, nickname: DEMO_ACCOUNT_NICKNAME, team: null, createdAt: 0,
  key: nicknameKey(DEMO_ACCOUNT_NICKNAME), hash: null, salt: null, iterations: 0,
})

/** 이 접속에서 Web Crypto를 쓸 수 있으면 SubtleCrypto, 아니면 null (https·localhost가 아니면 브라우저가 막는다) */
export function availableSubtle(): SubtleCrypto | null {
  if (typeof globalThis.isSecureContext === 'boolean' && !globalThis.isSecureContext) return null
  return globalThis.crypto?.subtle ?? null
}

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function pbkdf2(subtle: SubtleCrypto, password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256)
  return toB64(new Uint8Array(bits))
}

/** 새 계정 레코드: 무작위 값(salt)을 섞어 해시한 값만 저장한다 */
export async function newRecord(subtle: SubtleCrypto | null, id: string, nickname: string, password: string, team: string | null, now: number, iterations = PBKDF2_ITERATIONS): Promise<AccountRecord> {
  if (!subtle) throw new CryptoUnavailableError()
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const hash = await pbkdf2(subtle, password, salt, iterations)
  return { id, nickname, team, createdAt: now, key: nicknameKey(nickname), hash, salt: toB64(salt), iterations }
}

/** 비밀번호가 맞는지 (해시가 없는 데모 계정은 늘 false) */
export async function passwordMatches(subtle: SubtleCrypto | null, r: AccountRecord, password: string): Promise<boolean> {
  if (!subtle) throw new CryptoUnavailableError()
  if (!r.hash || !r.salt) return false
  return (await pbkdf2(subtle, password, fromB64(r.salt), r.iterations)) === r.hash
}
