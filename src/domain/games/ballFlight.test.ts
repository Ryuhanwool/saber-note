import { describe, expect, it } from 'vitest'
import { buildLeague } from '../league'
import { getDataSource } from '../../data/registry'
import { seededRandom } from '../random'
import { makePlay } from './battedBall'
import { ballFlight, fenceDistance, flightPath, FENCE_CENTER_M, FENCE_LINE_M } from './ballFlight'

describe('타구 애니메이션 경로', () => {
  it('같은 타구 속도·발사각·방향이면 결과(안타·아웃)와 상관없이 경로가 똑같다', async () => {
    const league = buildLeague(await getDataSource('demo').load())
    const rand = seededRandom('flight')
    for (let i = 0; i < 30; i++) {
      const play = makePlay(league, league.pool.H, rand)!
      const asHit = { ...play, hit: true, type: '단타' as const }
      const asOut = { ...play, hit: false, type: null }
      expect(flightPath(asHit)).toEqual(flightPath(asOut))
      expect(ballFlight(asHit)).toEqual(ballFlight(asOut))
    }
  })

  it('담장: 가운데 122m, 파울 라인 100m', () => {
    expect(fenceDistance(0)).toBe(FENCE_CENTER_M)
    expect(fenceDistance(-45)).toBe(FENCE_LINE_M)
    expect(fenceDistance(60)).toBe(FENCE_LINE_M)
  })

  it('담장을 넘는 타구(홈런 구간)는 마지막 위치가 담장 밖', () => {
    for (const [ev, la, deg] of [[158, 22, 0], [170, 28, -30], [185, 35, 35], [160, 30, 10]]) {
      const f = ballFlight({ ev, la, deg })
      expect(f.overFence).toBe(true)
      expect(f.end.d).toBeGreaterThan(f.fence)
      expect(Math.hypot(f.end.x, f.end.y)).toBeCloseTo(f.end.d, 6)
    }
  })

  it('담장을 넘지 않는 뜬공은 담장 안에 떨어진다 (아무리 세게 맞아도)', () => {
    for (const [ev, la, deg] of [[185, 40, 0], [157, 28, 0], [150, 20, -40], [120, 45, 20]]) {
      const f = ballFlight({ ev, la, deg })
      expect(f.overFence).toBe(false)
      expect(f.end.d).toBeLessThan(f.fence)
      expect(f.end.h).toBe(0)
    }
  })

  it('땅볼은 땅 위에서 끝나고, 낮게 튀며 굴러간다', () => {
    for (const [ev, la] of [[95, -25], [140, 0], [185, 9]]) {
      const path = flightPath({ ev, la, deg: 10 })
      const f = ballFlight({ ev, la, deg: 10 })
      expect(f.kind).toBe('ground')
      expect(path.at(-1)!.h).toBe(0)
      expect(Math.max(...path.map((p) => p.h))).toBeLessThanOrEqual(2.2)
      // 튀는 동안 땅에 다시 닿는다 (높이가 0으로 돌아오는 장면이 있다)
      expect(path.slice(1, -1).some((p) => p.h < 0.05)).toBe(true)
      expect(f.end.d).toBeLessThan(75)
    }
  })

  it('뜬공은 높이 떴다 떨어지고, 내야 뜬공은 높고 짧다', () => {
    const fly = ballFlight({ ev: 150, la: 30, deg: 0 })
    const pop = ballFlight({ ev: 140, la: 65, deg: 0 })
    expect(fly.kind).toBe('fly')
    expect(pop.kind).toBe('popup')
    expect(pop.apex).toBeGreaterThan(20)
    expect(pop.distance).toBeLessThan(60)
    const path = flightPath({ ev: 150, la: 30, deg: 0 })
    expect(path[0]).toEqual({ d: 0, h: 0, x: 0, y: 0 })
    expect(Math.max(...path.map((p) => p.h))).toBeCloseTo(fly.apex, 0)
    expect(path.at(-1)!.h).toBeCloseTo(0, 6)
  })

  it('애니메이션 길이는 1.5~2.5초', () => {
    for (const [ev, la] of [[95, -25], [120, 15], [185, 30], [185, 70], [140, 40]]) {
      const ms = ballFlight({ ev, la, deg: 0 }).durationMs
      expect(ms).toBeGreaterThanOrEqual(1500)
      expect(ms).toBeLessThanOrEqual(2500)
    }
  })

  it('방향: 음수 각도는 왼쪽(3루 쪽), 양수는 오른쪽', () => {
    expect(ballFlight({ ev: 150, la: 20, deg: -30 }).end.x).toBeLessThan(0)
    expect(ballFlight({ ev: 150, la: 20, deg: 30 }).end.x).toBeGreaterThan(0)
  })
})
