import { describe, expect, it } from 'vitest'
import { createMlbSource } from '../../data/mlb'
import { SAMPLE_OPTIONS } from '../../data/mlb/sample'
import { getDataSource } from '../../data/registry'
import type { RawDataset, RawHitter, RawWeek } from '../../data/types'
import { buildLeague } from '../league'
import type { HitterPlayer, League } from '../players'
import { makePlay, primaryFielder } from './battedBall'
import { blindHintsShown, dailyBlind, guessBlind, startBlind } from './blind'
import { dayKeyKST, weekIdKST } from './calendar'
import { gameBlockers } from './catalog'
import { challengePlayerIds, MIN_WEEKLY_PA, scoreChallenge, startChallenge, type ChallengeQuestion } from './challenge'
import { answerUpDown, nextUpDown, startUpDown, UPDOWN_KEYS, type UpDown } from './updown'

const demoSource = getDataSource('demo')
const raw = await demoSource.load()
const league = buildLeague(raw)
const pool = league.pool.H

/** 주어진 값을 차례로 돌려주는 난수 (다 쓰면 처음부터) */
const seq = (...xs: number[]) => {
  let i = 0
  return () => xs[i++ % xs.length]
}
const clone = (ds: RawDataset): RawDataset => structuredClone(ds)

describe('게임 1. 지표 업다운', () => {
  const base = (a: HitterPlayer, b: HitterPlayer): UpDown => ({ a, b, key: 'hr', streak: 2, result: null, over: false })
  const [lo, hi] = [...pool].sort((x, y) => x.m.hr - y.m.hr).filter((_, i, arr) => i === 0 || i === arr.length - 1)

  it('맞히면 연속 기록이 오르고, 틀리면 끝난다', () => {
    expect(answerUpDown(base(lo, hi), 'higher')).toMatchObject({ result: 'ok', streak: 3, over: false })
    expect(answerUpDown(base(lo, hi), 'lower')).toMatchObject({ result: 'no', streak: 2, over: true })
  })

  it('같은 값이면 높다·낮다 모두 정답', () => {
    expect(answerUpDown(base(lo, lo), 'higher').result).toBe('ok')
    expect(answerUpDown(base(lo, lo), 'lower').result).toBe('ok')
  })

  it('다음 문제에서는 오른쪽 선수가 기준이 되고, 틀린 뒤에는 넘어가지 않는다', () => {
    const ok = answerUpDown(base(lo, hi), 'higher')
    const next = nextUpDown(ok, pool, UPDOWN_KEYS, Math.random)
    expect(next.a).toBe(hi)
    expect(next.b).not.toBe(hi)
    expect(next.result).toBeNull()
    const no = answerUpDown(base(lo, hi), 'lower')
    expect(nextUpDown(no, pool, UPDOWN_KEYS, Math.random)).toBe(no)
  })

  it('타자가 2명 미만이면 시작하지 않는다', () => {
    expect(startUpDown(pool.slice(0, 1), UPDOWN_KEYS, Math.random)).toBeNull()
    const s = startUpDown(pool, UPDOWN_KEYS, Math.random)!
    expect(s.a).not.toBe(s.b)
  })
})

describe('게임 2. 블라인드 스탯 퀴즈', () => {
  it('보기 4개에 정답이 하나 들어 있고 서로 다르다', () => {
    const q = startBlind(pool, Math.random)!
    expect(q.options).toHaveLength(4)
    expect(new Set(q.options.map((p) => p.id)).size).toBe(4)
    expect(q.options).toContain(q.target)
    expect(startBlind(pool.slice(0, 3), Math.random)).toBeNull()
  })

  it('같은 날에는 같은 문제, 날이 바뀌면 다른 문제', () => {
    const a = dailyBlind(pool, '2026-10-31')!
    const b = dailyBlind(pool, '2026-10-31')!
    expect(b.target).toBe(a.target)
    expect(b.options.map((p) => p.id)).toEqual(a.options.map((p) => p.id))
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'].map((d) => dailyBlind(pool, d)!.target.id)
    expect(days.some((id) => id !== a.target.id)).toBe(true)
  })

  it('틀릴 때마다 힌트가 열리고, 3번 틀리면 끝난다', () => {
    let q = dailyBlind(pool, '2026-10-31')!
    const wrong = q.options.filter((p) => p !== q.target)
    q = guessBlind(q, wrong[0].id)
    expect(blindHintsShown(q, 3)).toBe(1)
    q = guessBlind(q, wrong[0].id) // 같은 보기를 다시 눌러도 세지 않는다
    expect(q.wrong).toHaveLength(1)
    q = guessBlind(guessBlind(q, wrong[1].id), wrong[2].id)
    expect(q).toMatchObject({ done: true, won: false })
    expect(blindHintsShown(q, 3)).toBe(3)
  })

  it('정답을 고르면 이긴다', () => {
    const q = dailyBlind(pool, '2026-10-31')!
    expect(guessBlind(q, q.target.id)).toMatchObject({ done: true, won: true })
  })
})

describe('게임 3. 세이버 픽 챌린지', () => {
  const starters = league.pitchers.filter((p) => p.raw.role === 'SP')
  const qs = startChallenge(pool, starters, seq(0.1, 0.7, 0.3, 0.9, 0.5))!
  const hitterLine = (id: string, PA: number, HR: number) => ({ id, PA, BB: 0, HBP: 0, SO: 0, HR, S1: 0, D2: 0, D3: 0 }) as RawWeek['hitters'][number]
  const pitcherLine = (id: string, GS: number, SO: number, HR: number) => ({ id, GS, outs: GS * 18, SO, BB: 0, HBP: 0, HR }) as RawWeek['pitchers'][number]
  /** 모든 문제에서 왼쪽(a)이 이기는 주간 기록 */
  const aWins = (q: ChallengeQuestion[], over: Partial<Record<number, 'short' | 'none'>> = {}): RawWeek => ({
    hitters: q.filter((x) => x.kind === 'H').flatMap((x, i) => [
      hitterLine(x.a.id, over[i] === 'short' ? MIN_WEEKLY_PA - 1 : 25, 5),
      hitterLine(x.b.id, 25, 0),
    ]),
    pitchers: q.filter((x) => x.kind === 'P').flatMap((x, i) => [
      pitcherLine(x.a.id, over[3 + i] === 'none' ? 0 : 1, 10, 0),
      pitcherLine(x.b.id, 1, 0, 3),
    ]),
  })

  it('타자 3문제 + 선발 2문제, 10명 모두 다른 선수', () => {
    expect(qs.map((q) => q.kind)).toEqual(['H', 'H', 'H', 'P', 'P'])
    expect(new Set(challengePlayerIds(qs)).size).toBe(10)
    expect(qs.filter((q) => q.kind === 'P').every((q) => q.a.raw.role === 'SP' && q.b.raw.role === 'SP')).toBe(true)
  })

  it('5문제 모두 맞히면 50점 + 보너스 10점, 하나 틀리면 40점', () => {
    expect(scoreChallenge(qs, ['a', 'a', 'a', 'a', 'a'], aWins(qs), league)).toMatchObject({ correctCount: 5, score: 60 })
    expect(scoreChallenge(qs, ['a', 'b', 'a', 'a', 'a'], aWins(qs), league)).toMatchObject({ correctCount: 4, score: 40 })
  })

  it('타자가 주간 10타석 미만이면 그 문제는 전원 정답 (10타석은 정상 채점)', () => {
    const r = scoreChallenge(qs, ['b', 'a', 'a', 'a', 'a'], aWins(qs, { 0: 'short' }), league)
    expect(r.results[0]).toMatchObject({ valid: false, winner: null, correct: true })
    expect(r.score).toBe(60)
    const ten = aWins(qs)
    ten.hitters[0].PA = MIN_WEEKLY_PA
    expect(scoreChallenge(qs, ['b', 'a', 'a', 'a', 'a'], ten, league).results[0]).toMatchObject({ valid: true, correct: false })
  })

  it('투수가 주간 등판이 없거나 기록이 아예 없으면 전원 정답', () => {
    const r = scoreChallenge(qs, ['a', 'a', 'a', 'b', 'a'], aWins(qs, { 3: 'none' }), league)
    expect(r.results[3]).toMatchObject({ valid: false, correct: true })
    const missing = scoreChallenge(qs, ['a', 'a', 'a', 'a', 'b'], { hitters: aWins(qs).hitters, pitchers: [] }, league)
    expect(missing.results[4]).toMatchObject({ valid: false, correct: true })
  })

  it('투수는 주간 FIP가 낮은 쪽이 이긴다', () => {
    const r = scoreChallenge(qs, ['a', 'a', 'a', 'a', 'a'], aWins(qs), league)
    const p = r.results[3]
    expect(p.a.value!).toBeLessThan(p.b.value!)
    expect(p.winner).toBe('a')
  })

  it('demo 주간 기록: 같은 주차는 같은 기록, 요청한 선수만, 타자·투수 구분', async () => {
    const ids = challengePlayerIds(qs)
    const w1 = await demoSource.loadWeek!('2026-W44', ids)
    expect(await demoSource.loadWeek!('2026-W44', ids)).toEqual(w1)
    expect(await demoSource.loadWeek!('2026-W45', ids)).not.toEqual(w1)
    expect(w1.hitters.map((w) => w.id)).toEqual(ids.slice(0, 6))
    expect(w1.pitchers.map((w) => w.id)).toEqual(ids.slice(6))
    // 요청 목록이 달라도 같은 선수는 같은 기록
    const one = await demoSource.loadWeek!('2026-W44', [ids[0]])
    expect(one.hitters[0]).toEqual(w1.hitters[0])
  })
})

describe('한국 시간 날짜·주차', () => {
  it('UTC 15시 이후는 한국 날짜로 다음 날', () => {
    expect(dayKeyKST(new Date('2026-10-31T14:59:00Z'))).toBe('2026-10-31')
    expect(dayKeyKST(new Date('2026-10-31T15:00:00Z'))).toBe('2026-11-01')
  })

  it('ISO 주차 (월요일 시작, 연말 53주 포함)', () => {
    expect(weekIdKST(new Date('2026-10-31T03:00:00Z'))).toBe('2026-W44') // 토요일
    expect(weekIdKST(new Date('2026-11-01T14:59:00Z'))).toBe('2026-W44') // 일요일 23:59 KST
    expect(weekIdKST(new Date('2026-11-01T15:00:00Z'))).toBe('2026-W45') // 월요일 00:00 KST
    expect(weekIdKST(new Date('2027-01-01T03:00:00Z'))).toBe('2026-W53')
    expect(weekIdKST(new Date('2026-01-01T03:00:00Z'))).toBe('2026-W01')
  })
})

describe('게임 4. 이 타구, 안타일까?', () => {
  const team = league.hitters[0].team

  /** 원시 데이터에 같은 팀 유격수를 한 명 더 넣는다 */
  function withExtraShortstop(inn: number | null, PA: number): League {
    const ds = clone(raw)
    const ss = ds.hitters.find((h) => h.team === team && h.pos === 'SS')!
    const extra: RawHitter = { ...structuredClone(ss), id: 'demo:999', name: '백업 유격수', PA, fielding: { ...ss.fielding, inn } }
    ds.hitters.push(extra)
    return buildLeague(ds)
  }

  it('수비수는 그 팀·그 포지션에서 수비 이닝이 가장 많은 선수 (300타석 미만이어도)', () => {
    const regular = league.hitters.find((h) => h.team === team && h.raw.pos === 'SS')!
    expect(primaryFielder(league, team, 'SS')).toBe(regular)
    const more = withExtraShortstop(regular.m.inn! + 100, 150)
    const picked = primaryFielder(more, team, 'SS')!
    expect(picked.name).toBe('백업 유격수')
    expect(picked.qualified).toBe(false)
  })

  it('300타석 넘는 선수가 둘이어도 이닝이 많은 쪽, 이닝이 같으면 목록에서 먼저 나온 쪽', () => {
    const regular = league.hitters.find((h) => h.team === team && h.raw.pos === 'SS')!
    expect(primaryFielder(withExtraShortstop(regular.m.inn! - 1, 500), team, 'SS')).toMatchObject({ id: regular.id })
    expect(primaryFielder(withExtraShortstop(regular.m.inn!, 500), team, 'SS')).toMatchObject({ id: regular.id })
  })

  it('그 포지션에 수비 이닝 기록이 있는 선수가 없으면 null', () => {
    const ds = clone(raw)
    ds.hitters = ds.hitters.filter((h) => !(h.team === team && h.pos === 'SS'))
    expect(primaryFielder(buildLeague(ds), team, 'SS')).toBeNull()
    expect(primaryFielder(league, team, 'DH')).toBeNull() // 지명타자는 수비 이닝이 없다
  })

  it('높이 뜬 내야 뜬공은 발·수비 보정이 없다', () => {
    // 난수 순서: 타자, 수비 팀, 타구 속도, 발사각(0.95 → 51°), 방향(C), 안타 판정, 그림 각도
    const play = makePlay(league, pool, seq(0, 0, 0.5, 0.95, 0.5, 0.99, 0.5))!
    expect(play).toMatchObject({ popup: true, speedAdj: 0, defenseAdj: 0, reason: 'popup', fielderPos: 'SS', hit: false })
  })

  it('땅볼은 빠른 타자일수록 안타 확률이 오른다', () => {
    const fastest = [...pool].sort((a, b) => b.m.sprint! - a.m.sprint!)[0]
    const play = makePlay(league, [fastest], seq(0, 0, 0.3, 0.2, 0, 0, 0.99, 0.5))!
    expect(play.la).toBeLessThan(10)
    expect(play.speedAdj).toBeCloseTo(0.05 * ((fastest.m.sprint! - 8.2) / 0.3), 10)
    expect(play.speedAdj).toBeGreaterThan(0)
  })

  it('출처에 스프린트 스피드가 없으면 주루 보정을 하지 않는다', () => {
    const ds = clone(raw)
    ds.meta.available.hitterTracking.sprint = false
    for (const h of ds.hitters) h.tracking.sprint = null
    const noSprint = buildLeague(ds)
    const play = makePlay(noSprint, noSprint.pool.H, seq(0, 0, 0.3, 0.2, 0, 0, 0.99, 0.5))!
    expect(play.speedAdj).toBe(0)
  })
})

describe('게임 열기 조건', () => {
  it('demo는 4개 게임을 모두 연다', () => {
    expect(Object.values(gameBlockers(league, true)).every((x) => x === null)).toBe(true)
  })

  it('MLB 표본: 주간 기록이 없어 챌린지는 닫히고, 타구 데이터가 있어 타구 게임은 열린다', async () => {
    const src = createMlbSource(SAMPLE_OPTIONS)
    const mlb = buildLeague(await src.load())
    const b = gameBlockers(mlb, Boolean(src.loadWeek))
    expect(b.challenge).toMatch(/주간 기록/)
    expect(b['batted-ball']).toBeNull()
    expect(b.updown).toBeNull()
  })
})
