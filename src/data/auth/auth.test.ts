import { IDBFactory } from 'fake-indexeddb'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoUnavailableError, NicknameTakenError, WrongCredentialsError, type AuthRepository } from '../source'
import { DEMO_ACCOUNT_ID, DEMO_ACCOUNT_NICKNAME } from '../types'
import { createBrowserAuth } from './browser'
import { createMemoryAuth } from './memory'
import { availableSubtle, newRecord, passwordMatches } from './shared'

const ITER = 1_000 // 테스트에서는 해시 반복을 줄인다
const opened: { close?: () => void }[] = []
afterEach(() => {
  opened.splice(0).forEach((r) => r.close?.())
})

function setup(kind: 'memory' | 'browser', indexedDB = new IDBFactory()): AuthRepository {
  const repo = kind === 'browser' ? createBrowserAuth({ indexedDB, iterations: ITER }) : createMemoryAuth({ iterations: ITER })
  opened.push(repo)
  return repo
}

describe('비밀번호 해시 (Web Crypto PBKDF2-SHA256)', () => {
  it('원문을 저장하지 않고, 같은 비밀번호도 계정마다 해시가 다르다', async () => {
    const subtle = availableSubtle()!
    const a = await newRecord(subtle, 'acct:a', '수달팬', 'secret123', null, 0, ITER)
    const b = await newRecord(subtle, 'acct:b', '산양팬', 'secret123', null, 0, ITER)
    expect(JSON.stringify(a)).not.toContain('secret123')
    expect(a.hash).not.toBe(b.hash)
    expect(a.salt).not.toBe(b.salt)
    expect(await passwordMatches(subtle, a, 'secret123')).toBe(true)
    expect(await passwordMatches(subtle, a, 'secret124')).toBe(false)
  })

  it('Web Crypto를 쓸 수 없는 접속이면 해시하지 않고 오류를 낸다', async () => {
    await expect(newRecord(null, 'acct:a', '수달팬', 'secret123', null, 0)).rejects.toBeInstanceOf(CryptoUnavailableError)
    const repo = createMemoryAuth({ subtle: null })
    expect(repo.cryptoAvailable).toBe(false)
    await expect(repo.signUp({ nickname: '수달팬', password: 'secret123', team: null })).rejects.toBeInstanceOf(CryptoUnavailableError)
  })
})

describe.each(['memory', 'browser'] as const)('계정 저장소 (%s)', (kind) => {
  it('처음에는 로그아웃 상태이고 데모 계정만 있다', async () => {
    const repo = setup(kind)
    expect(repo.cryptoAvailable).toBe(true)
    expect(await repo.current()).toBeNull()
    expect(await repo.nicknames()).toEqual([DEMO_ACCOUNT_NICKNAME])
  })

  it('가입하면 바로 로그인되고, 로그아웃 뒤 닉네임(대소문자 무시)·비밀번호로 다시 로그인한다', async () => {
    const repo = setup(kind)
    const seen: (string | null)[] = []
    repo.subscribe((a) => seen.push(a?.nickname ?? null))
    const a = await repo.signUp({ nickname: 'SaberFan', password: 'secret123', team: '한빛 수달스' })
    expect(a).toMatchObject({ nickname: 'SaberFan', team: '한빛 수달스', id: expect.stringMatching(/^acct:/) })
    expect(a).not.toHaveProperty('hash')
    expect(await repo.current()).toEqual(a)
    await repo.signOut()
    expect(await repo.current()).toBeNull()
    await expect(repo.signIn('saberfan', 'wrong-pass')).rejects.toBeInstanceOf(WrongCredentialsError)
    await expect(repo.signIn('없는닉네임', 'secret123')).rejects.toBeInstanceOf(WrongCredentialsError)
    expect(await repo.signIn('saberfan', 'secret123')).toEqual(a)
    expect(seen).toEqual(['SaberFan', null, 'SaberFan'])
  })

  it('닉네임 중복(대소문자·띄어쓰기 무시)은 가입할 수 없다', async () => {
    const repo = setup(kind)
    await repo.signUp({ nickname: 'SaberFan', password: 'secret123', team: null })
    await expect(repo.signUp({ nickname: 'saberfan', password: 'other123', team: null })).rejects.toBeInstanceOf(NicknameTakenError)
    await expect(repo.signUp({ nickname: DEMO_ACCOUNT_NICKNAME, password: 'other123', team: null })).rejects.toBeInstanceOf(NicknameTakenError)
  })

  it('데모 계정은 버튼으로만 로그인한다 (비밀번호로는 안 된다)', async () => {
    const repo = setup(kind)
    await expect(repo.signIn(DEMO_ACCOUNT_NICKNAME, '')).rejects.toBeInstanceOf(WrongCredentialsError)
    expect(await repo.signInDemo()).toMatchObject({ id: DEMO_ACCOUNT_ID, nickname: DEMO_ACCOUNT_NICKNAME })
  })

  it('시연 데이터 초기화: 기본은 계정·로그인을 남기고, accounts면 데모 계정만 남기고 로그아웃', async () => {
    const repo = setup(kind)
    const a = await repo.signUp({ nickname: '수달팬', password: 'secret123', team: null })
    await repo.resetDemoData!({ accounts: false })
    expect(await repo.current()).toEqual(a)
    await repo.resetDemoData!({ accounts: true })
    expect(await repo.current()).toBeNull()
    expect(await repo.nicknames()).toEqual([DEMO_ACCOUNT_NICKNAME])
  })
})

describe('브라우저 계정 저장소', () => {
  it('다시 열어도(새로고침) 계정과 로그인 상태가 남는다', async () => {
    const indexedDB = new IDBFactory()
    const a = await setup('browser', indexedDB).signUp({ nickname: '수달팬', password: 'secret123', team: null })
    const again = setup('browser', indexedDB)
    expect(await again.current()).toEqual(a)
    await again.signOut()
    expect(await again.signIn('수달팬', 'secret123')).toEqual(a)
  })
})
