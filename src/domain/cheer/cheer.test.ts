import { describe, expect, it } from 'vitest'
import type { CheerEvent, CheerMessage, PlayerId } from '../../data/types'
import { cheerCount, cheeredToday, lastMessageAt, MAX_CHEER_LENGTH, messagesFor, prepareCheerMessage, sameDay, topCheered } from './cheer'

const A = 'demo:1' as PlayerId
const B = 'demo:2' as PlayerId
const C = 'demo:3' as PlayerId
const players = [{ id: A, name: '김도윤' }, { id: B, name: '이하준' }, { id: C, name: '박서진' }]
const NOW = new Date(2026, 10, 7, 15, 0).getTime()
const HOUR = 3600_000
const DAY = 24 * HOUR
const ctx = { players, lastPostAt: null, now: NOW }

const ev = (playerId: PlayerId, userId: string, ago: number, id = `${playerId}-${userId}-${ago}`): CheerEvent => ({ id, playerId, userId, createdAt: NOW - ago })
const msg = (id: string, playerId: PlayerId, authorId: string, ago: number): CheerMessage => ({ id, playerId, authorId, authorName: null, text: '화이팅', createdAt: NOW - ago, reports: [], caution: false })

describe('응원 메시지 검사 (커뮤니티와 같은 작성 제한)', () => {
  it('보통 응원은 그대로 통과한다', () => {
    expect(prepareCheerMessage({ text: '  김도윤 오늘도 화이팅!  ' }, ctx)).toEqual({ ok: true, text: '김도윤 오늘도 화이팅!', caution: false })
  })

  it('비었거나 200자를 넘으면 막는다', () => {
    expect(prepareCheerMessage({ text: '   ' }, ctx)).toMatchObject({ ok: false, reason: 'empty' })
    expect(prepareCheerMessage({ text: '가'.repeat(MAX_CHEER_LENGTH) }, ctx).ok).toBe(true)
    expect(prepareCheerMessage({ text: '가'.repeat(MAX_CHEER_LENGTH + 1) }, ctx)).toMatchObject({ ok: false, reason: 'too-long', message: '응원 메시지는 200자까지 쓸 수 있어요.' })
  })

  it('심한 표현은 이유와 함께 막는다', () => {
    const r = prepareCheerMessage({ text: '김도윤 얼굴부터 좆같이 생김' }, ctx)
    expect(r).toMatchObject({ ok: false, reason: 'blocked' })
    if (!r.ok) expect(r.message).toMatch(/^이대로는 올릴 수 없어요\. .*인신공격/)
  })

  it('플레이에 대한 일반 욕은 허용한다 (원문 저장, 화면에서 가림)', () => {
    expect(prepareCheerMessage({ text: '씨발 홈런 미쳤다' }, ctx)).toEqual({ ok: true, text: '씨발 홈런 미쳤다', caution: false })
  })

  it('애매하면 확인을 받고, 그래도 올리면 「주의」', () => {
    const text = '니 말이 맞다 씨발 오늘 대박'
    expect(prepareCheerMessage({ text }, ctx)).toMatchObject({ ok: false, reason: 'needs-confirm' })
    expect(prepareCheerMessage({ text, confirmAmbiguous: true }, ctx)).toEqual({ ok: true, text, caution: true })
  })

  it('30초에 한 번만 올릴 수 있다', () => {
    const r = prepareCheerMessage({ text: '화이팅' }, { ...ctx, lastPostAt: NOW - 10_000 })
    expect(r).toMatchObject({ ok: false, reason: 'too-soon', waitMs: 20_000 })
    if (!r.ok) expect(r.message).toBe('도배를 막기 위해 30초에 한 번만 응원 메시지를 올릴 수 있어요. 20초 뒤에 다시 올려 주세요.')
    expect(prepareCheerMessage({ text: '화이팅' }, { ...ctx, lastPostAt: NOW - 30_000 }).ok).toBe(true)
  })

  it('도배 제한 기준: 내가 마지막으로 올린 메시지 (어느 응원방이든)', () => {
    const ms = [msg('1', A, 'me', 5 * HOUR), msg('2', B, 'me', 1000), msg('3', A, 'other', 0)]
    expect(lastMessageAt(ms, 'me')).toBe(NOW - 1000)
    expect(lastMessageAt(ms, 'nobody')).toBeNull()
  })
})

describe('응원방 메시지 목록', () => {
  it('이 선수 메시지만 최신순', () => {
    const ms = [msg('old', A, 'x', 3 * HOUR), msg('b', B, 'x', 0), msg('new', A, 'x', HOUR)]
    expect(messagesFor(ms, A).map((m) => m.id)).toEqual(['new', 'old'])
  })
})

describe('응원하기: 한 사람이 선수 한 명에게 하루 1번', () => {
  it('같은 날짜인지는 이 기기의 날짜로 판단한다 (자정에 다시 누를 수 있다)', () => {
    const late = new Date(2026, 10, 7, 23, 59).getTime()
    const midnight = new Date(2026, 10, 8, 0, 0).getTime()
    expect(sameDay(NOW, late)).toBe(true)
    expect(sameDay(late, midnight)).toBe(false)
  })

  it('오늘 이 선수를 응원했는지: 다른 선수·다른 사람·어제 기록은 상관없다', () => {
    // NOW는 오후 3시라 16시간 전은 어제 밤 11시
    const cheers = [ev(B, 'me', HOUR), ev(A, 'other', HOUR), ev(A, 'me', 16 * HOUR)]
    expect(cheeredToday(cheers, A, 'me', NOW)).toBe(false)
    expect(cheeredToday([...cheers, ev(A, 'me', 2 * HOUR)], A, 'me', NOW)).toBe(true)
  })

  it('누적 응원 수와 이번 주(7일) 응원 수', () => {
    const cheers = [ev(A, 'u1', HOUR), ev(A, 'u2', 6 * DAY), ev(A, 'u3', 7 * DAY), ev(A, 'u4', 30 * DAY), ev(B, 'u1', HOUR)]
    expect(cheerCount(cheers, A, NOW)).toEqual({ total: 4, week: 2 })
    expect(cheerCount(cheers, C, NOW)).toEqual({ total: 0, week: 0 })
  })
})

describe('이번 주 응원 순위', () => {
  it('최근 7일 「응원하기」 수 많은 순, 같으면 선수 목록 순, 0명은 빼고 n명까지', () => {
    const cheers = [
      ev(B, 'u1', HOUR), ev(B, 'u2', 2 * DAY), ev(B, 'u3', 20 * DAY),
      ev(C, 'u1', HOUR), ev(C, 'u2', DAY), ev(C, 'u3', 3 * DAY),
      ev(A, 'u1', 8 * DAY), ev(A, 'u2', 9 * DAY), ev(A, 'u3', 10 * DAY), ev(A, 'u4', 11 * DAY),
    ]
    expect(topCheered(cheers, players, NOW)).toEqual([{ id: C, count: 3 }, { id: B, count: 2 }])
    expect(topCheered([ev(B, 'u', 0), ev(A, 'u', 0)], players, NOW)).toEqual([{ id: A, count: 1 }, { id: B, count: 1 }])
    expect(topCheered(cheers, players, NOW, 1)).toEqual([{ id: C, count: 3 }])
  })

  it('응원 메시지는 순위에 세지 않는다 (「응원하기」 기록만 받는다)', () => {
    expect(topCheered([], players, NOW)).toEqual([])
  })
})

describe('예시 응원 메시지', () => {
  it('모두 작성 제한을 통과하고, 거친 표현 예시는 「주의」 없이 허용 수준이다', async () => {
    const { demoCheerSeeds } = await import('../../data/cheer/seed')
    const { getDataSource } = await import('../../data/registry')
    const { moderate } = await import('../community/moderation')
    const ds = await getDataSource('demo').load()
    const all = [...ds.hitters, ...ds.pitchers]
    const seeds = demoCheerSeeds(ds)
    for (const m of seeds.messages) {
      expect(prepareCheerMessage({ text: m.text }, { players: all, lastPostAt: null, now: NOW })).toMatchObject({ ok: true, caution: false })
    }
    expect(seeds.messages.filter((m) => moderate(m.text, { names: all.map((p) => p.name) }).level === 'mild')).toHaveLength(1)
  })
})
