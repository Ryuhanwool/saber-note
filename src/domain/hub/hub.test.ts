import { describe, expect, it } from 'vitest'
import { DEMO_ACCOUNT_ID, type CheerEvent, type CheerMessage, type CommunityPost, type MarketListing, type PlayerId } from '../../data/types'
import { challengeSchedule, challengeStatusText, formatRemaining } from '../games/schedule'
import {
  DEMO_START_POINTS, FAN_LEVELS, FAN_POINTS, fanActivities, fanLevel, fanScore, startPoints, weeklyCheers, type FanActivity,
} from './level'
import { cheeredAnyToday, hasNewSince, newsItems, recentCount } from './news'

const H = 60 * 60 * 1000
const D = 24 * H
// 2026-11-10(화) 12:00 한국 시간
const NOW = Date.UTC(2026, 10, 10, 3, 0)
const P = 'demo:1' as PlayerId

const post = (id: string, authorId: string, createdAt: number, reports: string[] = []): CommunityPost => ({
  id, authorId, authorName: authorId, text: `글 ${id}`, players: [], media: [], createdAt, likes: [], reports, masked: false, caution: false,
})
const listing = (id: string, authorId: string, createdAt: number, reports: string[] = []): MarketListing => ({
  id, authorId, sellerName: authorId, title: `판매 ${id}`, category: 'cap', players: [], price: 10000, condition: '좋음', text: '', media: [], createdAt, reports, caution: false,
})
const message = (id: string, authorId: string, createdAt: number, reports: string[] = []): CheerMessage => ({
  id, playerId: P, authorId, authorName: authorId, text: '화이팅', createdAt, reports, caution: false,
})
const cheer = (id: string, userId: string, createdAt: number, playerId: PlayerId = P): CheerEvent => ({ id, playerId, userId, createdAt })

describe('팬 레벨', () => {
  it('레벨 기준: 새내기 0 · 응원 10 · 열성 30 · 골수 60 · 전설 100', () => {
    expect(FAN_LEVELS.map((l) => [l.level, l.name, l.min])).toEqual([
      [1, '새내기 팬', 0], [2, '응원 팬', 10], [3, '열성 팬', 30], [4, '골수 팬', 60], [5, '전설의 팬', 100],
    ])
    expect(fanLevel(0)).toMatchObject({ level: 1, toNext: 10 })
    expect(fanLevel(9)).toMatchObject({ level: 1, toNext: 1 })
    expect(fanLevel(10)).toMatchObject({ level: 2, name: '응원 팬', toNext: 20 })
    expect(fanLevel(59)).toMatchObject({ level: 3, toNext: 1 })
    expect(fanLevel(100)).toMatchObject({ level: 5, next: null, toNext: null })
    expect(fanLevel(500).level).toBe(5)
  })

  it('점수: 응원하기 1 · 응원 메시지 2 · 커뮤니티 글 3 · 판매글 3 · 라인업 저장 5', () => {
    expect(FAN_POINTS).toEqual({ cheer: 1, 'cheer-message': 2, post: 3, listing: 3, lineup: 5 })
    const acts: FanActivity[] = [
      { kind: 'cheer', at: NOW }, { kind: 'cheer-message', at: NOW }, { kind: 'post', at: NOW }, { kind: 'listing', at: NOW }, { kind: 'lineup', at: NOW },
    ]
    expect(fanScore(acts).points).toBe(14)
  })

  it('반복하기 쉬운 활동은 하루(한국 날짜) 한도까지만 점수: 응원 10 · 메시지 3 · 글 3 · 판매글 2', () => {
    const many = (kind: FanActivity['kind'], n: number, at: number) => Array.from({ length: n }, (_, i) => ({ kind, at: at + i * 1000 }))
    const s = fanScore([...many('cheer', 15, NOW), ...many('cheer-message', 5, NOW), ...many('post', 6, NOW), ...many('listing', 4, NOW)])
    expect(s.byKind.cheer).toEqual({ count: 15, counted: 10, points: 10 })
    expect(s.byKind['cheer-message']).toEqual({ count: 5, counted: 3, points: 6 })
    expect(s.byKind.post).toEqual({ count: 6, counted: 3, points: 9 })
    expect(s.byKind.listing).toEqual({ count: 4, counted: 2, points: 6 })
    // 다음 날(한국 날짜)에는 다시 받는다
    const twoDays = fanScore([...many('post', 4, NOW), ...many('post', 4, NOW + D)])
    expect(twoDays.byKind.post.counted).toBe(6)
  })

  it('하루는 한국 날짜: 한국 시간 23:59와 0:01은 다른 날', () => {
    const before = Date.UTC(2026, 10, 10, 14, 59) // 11-10 23:59 KST
    const after = Date.UTC(2026, 10, 10, 15, 1) // 11-11 00:01 KST
    const acts: FanActivity[] = [...Array(3)].map((_, i) => ({ kind: 'post' as const, at: before - i })).concat([{ kind: 'post', at: after }])
    expect(fanScore(acts).byKind.post.counted).toBe(4)
  })

  it('라인업 저장은 계정마다 1번만 점수', () => {
    const s = fanScore([{ kind: 'lineup', at: NOW }, { kind: 'lineup', at: NOW + 3 * D }])
    expect(s.byKind.lineup.points).toBe(5)
  })

  it('활동 목록: 내 것만, 신고로 가려진 글·메시지·판매글은 빼고, 저장된 라인업이 있으면 1번', () => {
    const acts = fanActivities({
      userId: 'acct:me',
      cheers: [cheer('c1', 'acct:me', NOW), cheer('c2', 'acct:other', NOW)],
      cheerMessages: [message('m1', 'acct:me', NOW), message('m2', 'acct:me', NOW, ['a', 'b', 'c'])],
      posts: [post('p1', 'acct:me', NOW), post('p2', 'acct:other', NOW), post('p3', 'acct:me', NOW, ['a', 'b', 'c'])],
      listings: [listing('l1', 'acct:me', NOW)],
      lineup: { updatedAt: NOW },
    })
    expect(acts.map((a) => a.kind).sort()).toEqual(['cheer', 'cheer-message', 'lineup', 'listing', 'post'])
    expect(fanScore(acts).points).toBe(14)
  })

  it('데모 계정은 35점(Lv.3 열성 팬)에서 시작하고, 활동하면 더해진다', () => {
    expect(startPoints(DEMO_ACCOUNT_ID)).toBe(DEMO_START_POINTS)
    expect(startPoints('acct:me')).toBe(0)
    expect(fanLevel(fanScore([], startPoints(DEMO_ACCOUNT_ID)).points)).toMatchObject({ level: 3, name: '열성 팬', toNext: 25 })
    expect(fanScore([{ kind: 'post', at: NOW }], DEMO_START_POINTS).points).toBe(38)
  })

  it('이번 주 응원: 최근 7일 내가 누른 응원하기 수', () => {
    const cheers = [cheer('a', 'me', NOW - H), cheer('b', 'me', NOW - 6 * D), cheer('c', 'me', NOW - 7 * D - 1), cheer('d', 'you', NOW)]
    expect(weeklyCheers(cheers, 'me', NOW)).toBe(2)
  })
})

describe('챌린지 마감 (매주 화요일 18:30, 한국 시간)', () => {
  const kst = (y: number, mo: number, d: number, h: number, mi = 0) => Date.UTC(y, mo - 1, d, h - 9, mi)

  it('화요일 12:00이면 마감까지 6시간 30분, 월요일 0시는 1일 18시간 30분', () => {
    const s = challengeSchedule(kst(2026, 11, 10, 12))
    expect(s.phase).toBe('open')
    expect(s.deadline).toBe(kst(2026, 11, 10, 18, 30))
    expect(s.weekStart).toBe(kst(2026, 11, 9, 0))
    expect(challengeStatusText(s, kst(2026, 11, 10, 12))).toBe('마감까지 6시간 30분')
    const mon = kst(2026, 11, 9, 0)
    expect(challengeStatusText(challengeSchedule(mon), mon)).toBe('마감까지 1일 18시간')
  })

  it('화요일 18:30부터 일요일까지는 마감, 다음 월요일 0시에 새 주', () => {
    expect(challengeSchedule(kst(2026, 11, 10, 18, 30)).phase).toBe('closed')
    const sun = challengeSchedule(kst(2026, 11, 15, 23, 59))
    expect(sun.phase).toBe('closed')
    expect(sun.nextOpen).toBe(kst(2026, 11, 16, 0))
    expect(challengeStatusText(sun, kst(2026, 11, 15, 23, 59))).toBe('제출 마감 · 일요일 경기 뒤 채점')
    const nextMon = challengeSchedule(kst(2026, 11, 16, 0))
    expect(nextMon.phase).toBe('open')
    expect(nextMon.deadline).toBe(kst(2026, 11, 17, 18, 30))
  })

  it('한국 시간 기준: UTC로는 월요일 밤이어도 한국은 화요일', () => {
    const t = Date.UTC(2026, 10, 9, 20) // 11-10(화) 05:00 KST
    expect(challengeSchedule(t).deadline).toBe(kst(2026, 11, 10, 18, 30))
  })

  it('남은 시간 표시', () => {
    expect(formatRemaining(D + 3 * H + 59_000)).toBe('1일 3시간')
    expect(formatRemaining(2 * D)).toBe('2일')
    expect(formatRemaining(5 * H + 20 * 60_000)).toBe('5시간 20분')
    expect(formatRemaining(3 * H)).toBe('3시간')
    expect(formatRemaining(12 * 60_000 + 30_000)).toBe('12분')
    expect(formatRemaining(30_000)).toBe('1분 미만')
  })
})

describe('새 글 수·새 소식', () => {
  it('최근 24시간 글 수: 가려진 글과 앞으로의 글은 빼고 센다', () => {
    const posts = [post('a', 'x', NOW - H), post('b', 'x', NOW - 23 * H), post('c', 'x', NOW - 25 * H), post('d', 'x', NOW - H, ['1', '2', '3'])]
    expect(recentCount(posts, NOW)).toBe(2)
  })

  it('탭 바 점: 마지막으로 본 뒤 다른 사람이 쓴 글이 있을 때만 (처음이면 최근 24시간)', () => {
    const posts = [post('a', 'me', NOW - H), post('b', 'you', NOW - 3 * H)]
    expect(hasNewSince(posts, 'me', NOW - 2 * H, NOW)).toBe(false) // 내 글만 새것
    expect(hasNewSince(posts, 'me', NOW - 4 * H, NOW)).toBe(true)
    expect(hasNewSince(posts, 'me', null, NOW)).toBe(true)
    expect(hasNewSince([post('c', 'you', NOW - 2 * D)], 'me', null, NOW)).toBe(false)
  })

  it('오늘 응원했는지 (이 기기 날짜)', () => {
    expect(cheeredAnyToday([cheer('a', 'me', NOW)], 'me', NOW)).toBe(true)
    expect(cheeredAnyToday([cheer('a', 'me', NOW - 2 * D), cheer('b', 'you', NOW)], 'me', NOW)).toBe(false)
  })

  it('새 소식: 다른 사람의 최근 7일 글·판매글 최신순 10개, 마지막으로 본 뒤 것만 새것', () => {
    const posts = Array.from({ length: 8 }, (_, i) => post(`p${i}`, 'you', NOW - (i + 1) * H))
    const listings = [listing('l1', 'you', NOW - 30 * 60_000), listing('l2', 'me', NOW - 10 * 60_000), listing('old', 'you', NOW - 8 * D)]
    const r = newsItems({ posts, listings, userId: 'me', since: NOW - 2.5 * H, now: NOW, challenge: null })
    expect(r.items).toHaveLength(9)
    expect(r.items[0]).toMatchObject({ kind: 'listing', id: 'l1', fresh: true })
    expect(r.fresh).toBe(3) // l1, p0(1시간 전), p1(2시간 전)
    expect(newsItems({ posts: [...posts, ...posts.map((p) => ({ ...p, id: p.id + 'b' }))], listings, userId: 'me', since: null, now: NOW, challenge: null }).items).toHaveLength(10)
  })

  it('챌린지 마감 알림은 마감 24시간 전부터', () => {
    const tueNoon = NOW // 화 12:00, 마감 18:30
    const s = challengeSchedule(tueNoon)
    const r = newsItems({ posts: [], listings: [], userId: null, since: null, now: tueNoon, challenge: s })
    expect(r.items).toEqual([expect.objectContaining({ kind: 'challenge', deadline: s.deadline, fresh: true })])
    const mon = Date.UTC(2026, 10, 9, 3) // 월 12:00 — 마감까지 30시간 30분
    expect(newsItems({ posts: [], listings: [], userId: null, since: null, now: mon, challenge: challengeSchedule(mon) }).items).toEqual([])
    const wed = NOW + D
    expect(newsItems({ posts: [], listings: [], userId: null, since: null, now: wed, challenge: challengeSchedule(wed) }).items).toEqual([])
  })
})
