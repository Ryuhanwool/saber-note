import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { extractGolden, GOLDEN_JSON } from './golden.ts'

describe('데모 골든 데이터', () => {
  const fresh = extractGolden()

  it('같은 시드로 실행하면 매번 같은 값이 나온다', () => {
    expect(extractGolden()).toEqual(fresh)
  })

  it('저장된 골든 파일이 현재 데모 HTML과 일치한다', () => {
    const saved = JSON.parse(readFileSync(GOLDEN_JSON, 'utf8'))
    expect(saved).toEqual(fresh)
  })

  it('타자·투수와 지표 계산값이 모두 들어 있다', () => {
    const hitters = fresh.players.filter((p) => p.type === 'H')
    const pitchers = fresh.players.filter((p) => p.type === 'P')
    expect(hitters).toHaveLength(60)
    expect(pitchers).toHaveLength(30)
    for (const p of hitters) expect(p).toHaveProperty('wrcp')
    for (const p of pitchers) expect(p).toHaveProperty('fip')
    expect(Object.keys(fresh.battedBalls)).toHaveLength(60)
  })
})
