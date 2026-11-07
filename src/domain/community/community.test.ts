import { describe, expect, it } from 'vitest'
import type { CommunityPost, PlayerId } from '../../data/types'
import { maskMild, moderate } from './moderation'
import {
  autoTag, canDelete, canReport, checkFiles, isHiddenByReports, MAX_FILE_BYTES, playerBuzz, postWaitMs, preparePost,
  relatedPosts, timeAgo, topDiscussed,
} from './posts'

describe('작성 제한: 차단', () => {
  it('심한 욕설·혐오·위협은 차단하고, 이유와 걸린 표현을 알려 준다', () => {
    expect(moderate('이 선수 씨발 진짜')).toEqual({ level: 'block', reasons: ['욕설'], found: ['씨발'] })
    expect(moderate('한남충 같은 소리')).toMatchObject({ level: 'block', reasons: ['혐오·비하'] })
    expect(moderate('죽여버린다 진짜')).toMatchObject({ level: 'block', reasons: ['위협'] })
  })

  it('띄어쓰기·숫자·기호를 끼우거나 영문 자판으로 쓴 우회 표현도 걸러 낸다', () => {
    for (const t of ['씨 발', '씨1발', '씨.발', 'ㅅ ㅂ', 'ㅅ-ㅂ', 'TLQKF', '병 1 신']) {
      expect(moderate(t).level, t).toBe('block')
    }
  })

  it('전화번호는 하이픈·공백·점이 있어도 개인정보로 차단한다', () => {
    for (const t of ['연락 010-1234-5678', '01012345678', '010 1234 5678', '010.123.4567', '011-123-4567']) {
      expect(moderate(t), t).toMatchObject({ level: 'block', reasons: ['개인정보(전화번호)'] })
    }
  })

  it('문제없는 글은 통과한다 (오탐 예시 포함)', () => {
    for (const t of ['오늘 wRC+ 140 찍었네요', '시발점에서 다시 출발', 'OPS .910, 타율 .310', '2026년 10월 31일 경기']) {
      expect(moderate(t), t).toEqual({ level: 'ok' })
    }
  })

  it('차단 표현과 거친 표현이 함께 있으면 차단이 우선', () => {
    expect(moderate('존나 씨발').level).toBe('block')
  })
})

describe('작성 제한: 거친 표현 가리기', () => {
  it('거친 표현은 통과시키되 ●로 가린다', () => {
    expect(moderate('존나 잘한다')).toEqual({ level: 'mild', found: ['존나'] })
    expect(maskMild('존나 잘한다')).toBe('●● 잘한다')
  })

  it('띄어 쓰거나 숫자를 끼운 거친 표현도 가린다 (데모에서는 가려지지 않던 경우)', () => {
    expect(moderate('존 나 잘한다').level).toBe('mild')
    expect(maskMild('존 나 잘한다')).toBe('●●● 잘한다')
    expect(maskMild('존1나 잘한다')).toBe('●●● 잘한다')
    expect(maskMild('ㅈ.ㄴ 웃기네')).toBe('●●● 웃기네')
  })

  it('여러 번 나오면 모두 가리고, 나머지 글자는 그대로 둔다', () => {
    expect(maskMild('존나 꺼져 진짜 존나')).toBe('●● ●● 진짜 ●●')
    expect(maskMild('평범한 글')).toBe('평범한 글')
  })
})

describe('파일 검사', () => {
  const f = (name: string, type: string, size = 1000) => ({ name, type, size })

  it('최대 4개, 허용 형식, 파일당 20MB', () => {
    const r = checkFiles(2, [f('a.png', 'image/png'), f('b.txt', 'text/plain'), f('c.mp4', 'video/mp4', MAX_FILE_BYTES + 1), f('d.gif', 'image/gif'), f('e.jpg', 'image/jpeg')])
    expect(r.accepted).toEqual([0, 3])
    expect(r.errors).toEqual([
      'b.txt: PNG, JPG, WEBP, GIF, MP4, WEBM 파일만 올릴 수 있어요',
      'c.mp4: 20MB를 넘어요. 용량을 줄여서 다시 올려 주세요',
      '파일은 4개까지 올릴 수 있어요',
    ])
  })

  it('정확히 20MB는 올릴 수 있다', () => {
    expect(checkFiles(0, [f('v.webm', 'video/webm', MAX_FILE_BYTES)]).accepted).toEqual([0])
  })
})

describe('게시 검사', () => {
  const players = [
    { id: 'demo:1' as PlayerId, name: '김도윤' },
    { id: 'demo:2' as PlayerId, name: '이하준' },
  ]
  const ctx = { players, lastPostAt: null, now: 1_000_000 }

  it('본문 속 선수 이름을 자동으로 태그한다 (직접 단 태그와 중복 없이)', () => {
    expect(autoTag('김도윤 오늘 미쳤다', ['demo:2'], players)).toEqual(['demo:2', 'demo:1'])
    expect(autoTag('김도윤 김도윤', ['demo:1'], players)).toEqual(['demo:1'])
  })

  it('글도 파일도 없으면 막고, 파일만 있으면 통과', () => {
    expect(preparePost({ text: '   ', players: [], fileCount: 0 }, ctx)).toMatchObject({ ok: false, reason: 'empty' })
    expect(preparePost({ text: '', players: [], fileCount: 1 }, ctx)).toMatchObject({ ok: true, text: '' })
  })

  it('1000자를 넘으면 막는다', () => {
    expect(preparePost({ text: '가'.repeat(1001), players: [], fileCount: 0 }, ctx)).toMatchObject({ ok: false, reason: 'too-long' })
  })

  it('차단 표현이 있으면 이유와 표현을 담아 막는다', () => {
    const r = preparePost({ text: '병신 같은 수비', players: [], fileCount: 0 }, ctx)
    expect(r).toMatchObject({ ok: false, reason: 'blocked' })
    if (!r.ok) expect(r.message).toContain('욕설에 해당하는 표현(병신)')
  })

  it('30초 안에 다시 올리면 남은 시간을 알려 주며 막는다', () => {
    const r = preparePost({ text: '두 번째 글', players: [], fileCount: 0 }, { ...ctx, lastPostAt: ctx.now - 10_000 })
    expect(r).toMatchObject({ ok: false, reason: 'too-soon', waitMs: 20_000 })
    expect(postWaitMs(ctx.now - 30_000, ctx.now)).toBe(0)
  })

  it('통과하면 거친 표현을 가리고 자동 태그를 붙인다', () => {
    expect(preparePost({ text: ' 이하준 존 나 잘함 ', players: [], fileCount: 0 }, ctx)).toEqual({
      ok: true, text: '이하준 ●●● 잘함', players: ['demo:2'], masked: true,
    })
  })
})

describe('신고·삭제·선수별 집계', () => {
  const now = 10 * 24 * 60 * 60 * 1000
  const post = (id: string, over: Partial<CommunityPost>): CommunityPost => ({
    id, authorId: 'me', text: '', players: [], media: [], createdAt: now, likes: [], reports: [], masked: false, ...over,
  })
  const kim = { id: 'demo:1' as PlayerId, name: '김도윤' }
  const lee = { id: 'demo:2' as PlayerId, name: '이하준' }

  it('신고 3번이면 가린다', () => {
    expect(isHiddenByReports(post('a', { reports: ['x', 'y'] }))).toBe(false)
    expect(isHiddenByReports(post('a', { reports: ['x', 'y', 'z'] }))).toBe(true)
  })

  it('자기 글은 신고할 수 없고, 한 글에 한 번만 신고한다. 삭제는 자기 글만', () => {
    const p = post('a', { authorId: 'me', reports: ['you'] })
    expect(canReport(p, 'me')).toBe(false)
    expect(canReport(p, 'you')).toBe(false)
    expect(canReport(p, 'other')).toBe(true)
    expect(canReport(p, null)).toBe(false)
    expect(canDelete(p, 'me')).toBe(true)
    expect(canDelete(p, 'you')).toBe(false)
  })

  it('선수 관련 글은 태그나 본문 이름으로 찾고, 최근 24시간 글을 따로 센다', () => {
    const posts = [
      post('1', { players: ['demo:1'] }),
      post('2', { text: '김도윤 홈런', createdAt: now - 25 * 60 * 60 * 1000 }),
      post('3', { text: '이하준 수비' }),
    ]
    expect(relatedPosts(posts, kim).map((x) => x.id)).toEqual(['1', '2'])
    expect(playerBuzz(posts, kim, now)).toEqual({ total: 2, last24h: 1 })
  })

  it('이번 주 많이 이야기된 선수: 7일 안의 글만, 글 수 많은 순', () => {
    const posts = [
      post('1', { text: '이하준' }),
      post('2', { text: '이하준 김도윤' }),
      post('3', { text: '김도윤', createdAt: now - 8 * 24 * 60 * 60 * 1000 }),
    ]
    expect(topDiscussed(posts, [kim, lee], now)).toEqual([{ id: 'demo:2', count: 2 }, { id: 'demo:1', count: 1 }])
  })

  it('작성 시각 표시', () => {
    expect(timeAgo(now - 30_000, now)).toBe('방금')
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5분 전')
    expect(timeAgo(now - 3 * 3600_000, now)).toBe('3시간 전')
    expect(timeAgo(now - 2 * 86400_000, now)).toBe('2일 전')
  })
})
