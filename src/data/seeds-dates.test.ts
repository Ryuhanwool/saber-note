import { describe, expect, it } from 'vitest'
import { demoCheerSeeds } from './cheer/seed'
import { demoCommunitySeeds } from './community/seed'
import { DEMO_BASE_DATE, addDays } from './demo/season'
import { demoMarketSeeds } from './market/seed'
import { getDataSource } from './registry'
import { seedStars } from './seedPlayers'

const source = getDataSource('demo')
const DATES = [DEMO_BASE_DATE, addDays(DEMO_BASE_DATE, 1), addDays(DEMO_BASE_DATE, -30), addDays(DEMO_BASE_DATE, 200), '2028-04-01']
/** 기록 숫자·순위를 적은 표현 (날짜에 따라 틀린 말이 될 수 있다) */
const RECORD_TALK = /(홈런|도루|탈삼진|삼진|안타|타점|세이브|승)\s*\d|\d+\s*(호|개째|위)|\d+개!|1위/

const strip = <T extends object>(xs: T[]) => xs.map((x) => JSON.stringify(x, (_k, v) => (v instanceof Blob ? `blob:${v.size}` : v)))

describe('예시 글·응원·판매글은 날짜를 옮겨도 같다 (기록이 날마다 바뀌어도 화면과 어긋나지 않게)', () => {
  it('태그 선수와 문장이 어느 날짜든 같다', async () => {
    const all = await Promise.all(DATES.map((d) => source.loadDay!(d)))
    const [first, ...rest] = all
    for (const ds of rest) {
      expect(seedStars(ds).sluggers.map((h) => h.id)).toEqual(seedStars(first).sluggers.map((h) => h.id))
      expect(strip(demoCommunitySeeds(ds))).toEqual(strip(demoCommunitySeeds(first)))
      expect(demoCheerSeeds(ds)).toEqual(demoCheerSeeds(first))
      expect(strip(demoMarketSeeds(ds))).toEqual(strip(demoMarketSeeds(first)))
    }
  })

  it('문장에 기록 숫자나 순위를 쓰지 않는다', async () => {
    const ds = await source.loadDay!(DEMO_BASE_DATE)
    const texts = [
      ...demoCommunitySeeds(ds).map((s) => s.text),
      ...demoCheerSeeds(ds).messages.map((m) => m.text),
      ...demoMarketSeeds(ds).flatMap((l) => [l.title, l.text]),
    ]
    for (const t of texts) expect(t, t).not.toMatch(RECORD_TALK)
  })
})
