// 가상 리그의 하루 단위 기록: 기록은 그날(한국 시간)까지의 최근 144경기일 합계다.
//
// - 기준일(DEMO_BASE_DATE)의 기록 = 생성기가 만든 시즌 기록 그대로 (원본 데모·골든 값과 같다).
//   이 시즌 기록을 기준일까지의 144경기일에 나눠 둔다(합계는 그대로).
// - 그 밖의 날짜는 선수의 실력(타석 결과·클러치 확률)으로 그날 경기를 시뮬레이션한다. 난수 시드는 날짜와 선수로 정한다.
// - 날짜 D의 기록 = D를 마지막 날로 하는 144일의 경기 합계. 같은 날짜면 늘 같은 기록이고,
//   하루 변화는 경기 하나가 들어오고 가장 오래된 경기 하나가 빠지는 만큼이다.
// - 수비·트래킹·추가 진루율은 시즌 값 그대로 둔다 (데모 단순화).
import type { InningCounts, PlayerId, RawHitter, RawHitterClutch, RawPitcher, RawPitcherClutch, WinLossCounts } from '../types'
import { BULLPEN_SEED_OFFSET, allHolds, daySaves, lateHolds } from './bullpen'
import { HITTER_CLUTCH_HITS, hitterClutchParams, pitcherClutchParams } from './clutch'
import type { HitterRates, PitcherRates } from './generate'
import { mulberry32, type Rand } from './random'

/** 이 날짜의 기록이 생성기의 시즌 기록과 같다 (YYYY-MM-DD, 한국 날짜) */
export const DEMO_BASE_DATE = '2026-11-10'
/** 한 시즌 경기일 수 (매일이 경기일) */
export const SEASON_DAYS = 144

const DAY_MS = 24 * 60 * 60 * 1000
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 한국 날짜 "YYYY-MM-DD" (한국 시간 0시에 바뀐다) */
export const kstDate = (now: Date) => new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const dayNumber = (date: string) => {
  if (!DATE_RE.test(date)) throw new Error(`날짜 형식이 아닙니다: ${date}`)
  const [y, m, d] = date.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}

// ---------- 나누기 도구 ----------

function shuffle<T>(a: T[], R: Rand): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** n개를 가중치에 따라 칸에 하나씩 넣고, 각 단위가 들어간 칸 번호 목록을 돌려준다 */
function placeUnits(n: number, weights: number[], R: Rand): number[] {
  const total = weights.reduce((a, b) => a + b, 0)
  const out: number[] = []
  for (let u = 0; u < n; u++) {
    let x = R() * total, i = 0
    while (i < weights.length - 1 && x >= weights[i]) x -= weights[i++]
    out.push(i)
  }
  return out
}

/** 칸별 개수 → 단위 목록 (칸 번호를 개수만큼) */
const unitsOf = (counts: number[]) => counts.flatMap((c, i) => Array<number>(c).fill(i))
const countsOf = (units: number[], slots: number) => {
  const c = Array<number>(slots).fill(0)
  for (const u of units) c[u]++
  return c
}

/** 부모 단위 중에서 겹치지 않게 차례로 골라 자식들에게 나눈다 (자식 합 ≤ 부모 수) */
function takeDisjoint(parent: number[], sizes: number[], R: Rand): number[][] {
  const pool = shuffle([...parent], R)
  let at = 0
  return sizes.map((n) => pool.slice(at, (at += n)))
}

// ---------- 하루 기록 모양 ----------

type Phase = keyof InningCounts
const PHASES: Phase[] = ['early', 'late', 'extra']

export type HitterDay = Pick<RawHitter, 'PA' | 'BB' | 'HBP' | 'SO' | 'HR' | 'S1' | 'D2' | 'D3' | 'SB' | 'CS'> & { clutch: RawHitterClutch | null }
export type PitcherDay = Pick<RawPitcher, 'outs' | 'TBF' | 'SO' | 'BB' | 'HR' | 'HBP' | 'H' | 'ER'> & {
  /** 세이브·홀드 (선발은 늘 0, 합계에서 null로 바꾼다) */
  SV: number
  HLD: number
  clutch: RawPitcherClutch | null
}

const zeroIC = (): InningCounts => ({ early: 0, late: 0, extra: 0 })
const zeroWL = (): WinLossCounts => ({ won: zeroIC(), lost: zeroIC() })
export const zeroHitterClutch = (): RawHitterClutch => ({
  games: 0, battingChances: zeroIC(), goAhead: zeroWL(), tying: zeroWL(), chase1: zeroWL(), chase2: zeroWL(), chase3: zeroWL(),
  stealChances: zeroIC(), steals: zeroWL(), stealRuns: zeroWL(), defenseChances: zeroIC(), defensePlays: zeroWL(),
})
export const zeroPitcherClutch = (): RawPitcherClutch => ({
  games: 0, crisis: zeroIC(), escapes: zeroIC(), escapesLastK: zeroIC(), escapesNoBB: zeroIC(),
  leadApps1: zeroIC(), leadHeld1: zeroIC(), leadAppsMulti: zeroIC(), leadHeldMulti: zeroIC(),
})

/** 숫자 필드를 모두 더한다 (중첩 객체 포함). target을 바꾼다 */
function addInto(target: Record<string, unknown>, src: Record<string, unknown>) {
  for (const k of Object.keys(src)) {
    const v = src[k]
    if (typeof v === 'number') target[k] = (target[k] as number) + v
    else if (v && typeof v === 'object') addInto(target[k] as Record<string, unknown>, v as Record<string, unknown>)
  }
}

/** 칸(경기)별 단위 목록 → 그 경기의 클러치 기록 경로에 1씩 더한다 */
function addUnits<T>(days: (T | null)[], gameDays: number[], units: number[], get: (d: T) => InningCounts, ph: Phase) {
  for (const u of units) {
    const d = days[gameDays[u]]
    if (d) get(d)[ph]++
  }
}

// ---------- 타자: 시즌 기록을 144경기일에 나누기 ----------

function splitHitter(h: RawHitter, R: Rand): (HitterDay | null)[] {
  const days: (HitterDay | null)[] = Array(SEASON_DAYS).fill(null)
  const G = Math.max(1, Math.min(SEASON_DAYS, h.clutch?.games ?? Math.round(h.PA / 4.3)))
  const gameDays = shuffle([...Array(SEASON_DAYS).keys()], R).slice(0, G).sort((a, b) => a - b)
  // 경기마다 타석: 고르게 나누고 나머지는 무작위 경기에 1씩
  const pa = Array<number>(G).fill(Math.floor(h.PA / G))
  for (const i of shuffle([...Array(G).keys()], R).slice(0, h.PA - pa[0] * G)) pa[i]++
  // 타석 결과를 섞어 경기 순서대로 자른다
  const outs = h.PA - h.BB - h.HBP - h.SO - h.HR - h.S1 - h.D2 - h.D3
  const kinds = shuffle([
    ...Array<string>(h.BB).fill('BB'), ...Array<string>(h.HBP).fill('HBP'), ...Array<string>(h.SO).fill('SO'), ...Array<string>(h.HR).fill('HR'),
    ...Array<string>(h.S1).fill('S1'), ...Array<string>(h.D2).fill('D2'), ...Array<string>(h.D3).fill('D3'), ...Array<string>(Math.max(0, outs)).fill('out'),
  ], R)
  const onFirstUnits: number[] = [] // 1루 출루(단타·볼넷·몸에 맞는 공)가 나온 경기 번호
  let at = 0
  gameDays.forEach((day, g) => {
    const d: HitterDay = { PA: pa[g], BB: 0, HBP: 0, SO: 0, HR: 0, S1: 0, D2: 0, D3: 0, SB: 0, CS: 0, clutch: h.clutch ? { ...zeroHitterClutch(), games: 1 } : null }
    for (let i = 0; i < pa[g]; i++) {
      const k = kinds[at++]
      if (k !== 'out') d[k as 'BB']++
      if (k === 'S1' || k === 'BB' || k === 'HBP') onFirstUnits.push(g)
    }
    days[day] = d
  })
  const [sb, cs] = takeDisjoint(onFirstUnits, [h.SB, h.CS], R)
  for (const g of sb) days[gameDays[g]]!.SB++
  for (const g of cs) days[gameDays[g]]!.CS++

  const c = h.clutch
  if (c) {
    const paW = pa
    const baseW = gameDays.map((day, g) => { const d = days[day]!; return d.S1 + d.D2 + d.BB + d.HBP || 0.2 * pa[g] })
    for (const ph of PHASES) {
      const bat = placeUnits(c.battingChances[ph], paW, R)
      addUnits(days, gameDays, bat, (d) => d.clutch!.battingChances, ph)
      const keys = ['goAhead', 'tying', 'chase1', 'chase2', 'chase3'] as const
      const sizes = keys.flatMap((k) => [c[k].won[ph], c[k].lost[ph]])
      takeDisjoint(bat, sizes, R).forEach((units, i) => {
        const k = keys[i >> 1], side = i % 2 === 0 ? 'won' : 'lost'
        addUnits(days, gameDays, units, (d) => d.clutch![k][side], ph)
      })
      const steal = placeUnits(c.stealChances[ph], baseW, R)
      addUnits(days, gameDays, steal, (d) => d.clutch!.stealChances, ph)
      const [sw, sl] = takeDisjoint(steal, [c.steals.won[ph], c.steals.lost[ph]], R)
      addUnits(days, gameDays, sw, (d) => d.clutch!.steals.won, ph)
      addUnits(days, gameDays, sl, (d) => d.clutch!.steals.lost, ph)
      addUnits(days, gameDays, takeDisjoint(sw, [c.stealRuns.won[ph]], R)[0], (d) => d.clutch!.stealRuns.won, ph)
      addUnits(days, gameDays, takeDisjoint(sl, [c.stealRuns.lost[ph]], R)[0], (d) => d.clutch!.stealRuns.lost, ph)
      const def = placeUnits(c.defenseChances[ph], paW, R)
      addUnits(days, gameDays, def, (d) => d.clutch!.defenseChances, ph)
      const [dw, dl] = takeDisjoint(def, [c.defensePlays.won[ph], c.defensePlays.lost[ph]], R)
      addUnits(days, gameDays, dw, (d) => d.clutch!.defensePlays.won, ph)
      addUnits(days, gameDays, dl, (d) => d.clutch!.defensePlays.lost, ph)
    }
  }
  return days
}

// ---------- 투수: 시즌 기록을 등판일에 나누기 ----------

function splitPitcher(p: RawPitcher, R: Rand): (PitcherDay | null)[] {
  const days: (PitcherDay | null)[] = Array(SEASON_DAYS).fill(null)
  const sp = p.role === 'SP'
  const G = Math.max(1, Math.min(sp ? Math.floor(SEASON_DAYS / 4) : SEASON_DAYS, p.clutch?.games ?? Math.round(p.outs / 3 / (sp ? 5.7 : 1.05)), p.outs))
  const gameDays = shuffle([...Array(SEASON_DAYS).keys()], R).slice(0, G).sort((a, b) => a - b)
  // 등판마다 잡은 아웃: 최소 1개, 나머지는 들쭉날쭉하게 (짧은 등판·긴 등판)
  const lengthW = gameDays.map(() => 0.6 + R())
  const outs = countsOf(placeUnits(p.outs - G, lengthW, R), G).map((x) => x + 1)
  // 한 등판 최대 아웃: 선발 24개(8이닝), 불펜 9개(3이닝). 넘친 아웃은 여유 있는 다른 등판으로 옮긴다
  const maxOuts = sp ? 24 : 9
  for (let i = 0; i < G && p.outs <= G * maxOuts; i++) {
    while (outs[i] > maxOuts) {
      const j = Math.floor(R() * G)
      if (outs[j] < maxOuts) { outs[i]--; outs[j]++ }
    }
  }
  const outUnits = unitsOf(outs)
  const soUnits = takeDisjoint(outUnits, [p.SO], R)[0]
  const extraTBF = Math.max(0, p.TBF - p.outs)
  const tbf = countsOf(placeUnits(extraTBF, outs, R), G).map((x, i) => x + outs[i])
  const hUnits = placeUnits(p.H, outs, R)
  const hrUnits = takeDisjoint(hUnits, [Math.min(p.HR, p.H)], R)[0]
  const bb = countsOf(placeUnits(p.BB, outs, R), G)
  const hbp = countsOf(placeUnits(p.HBP, outs, R), G)
  const h = countsOf(hUnits, G), hr = countsOf(hrUnits, G), so = countsOf(soUnits, G)
  const erW = outs.map((_, i) => h[i] + bb[i] + hbp[i] + 2 * hr[i] + 0.2)
  const er = countsOf(placeUnits(p.ER, erW, R), G)
  gameDays.forEach((day, g) => {
    days[day] = {
      outs: outs[g], TBF: tbf[g], SO: so[g], BB: bb[g], HR: hr[g], HBP: hbp[g], H: h[g], ER: er[g],
      SV: 0, HLD: 0,
      clutch: p.clutch ? { ...zeroPitcherClutch(), games: 1 } : null,
    }
  })
  const c = p.clutch
  if (c) {
    const even = gameDays.map(() => 1)
    for (const ph of PHASES) {
      const crisis = placeUnits(c.crisis[ph], outs, R)
      addUnits(days, gameDays, crisis, (d) => d.clutch!.crisis, ph)
      const esc = takeDisjoint(crisis, [c.escapes[ph]], R)[0]
      addUnits(days, gameDays, esc, (d) => d.clutch!.escapes, ph)
      addUnits(days, gameDays, takeDisjoint(esc, [c.escapesLastK[ph]], R)[0], (d) => d.clutch!.escapesLastK, ph)
      addUnits(days, gameDays, takeDisjoint(esc, [c.escapesNoBB[ph]], R)[0], (d) => d.clutch!.escapesNoBB, ph)
      for (const [apps, held] of [['leadApps1', 'leadHeld1'], ['leadAppsMulti', 'leadHeldMulti']] as const) {
        const a = placeUnits(c[apps][ph], even, R)
        addUnits(days, gameDays, a, (d) => d.clutch![apps], ph)
        addUnits(days, gameDays, takeDisjoint(a, [c[held][ph]], R)[0], (d) => d.clutch![held], ph)
      }
    }
  }
  return days
}

// ---------- 날짜별 기록 ----------

/** 32비트 정수 섞기 (날짜·선수로 기준 시즌 경기 하나를 고를 때) */
function mix(a: number, b: number, c: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be59b, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12
  return h >>> 0
}

/**
 * 기준 시즌의 세이브를 등판일에 나눈다: 그날 7회 이후 지킨 리드 중에서 고른다. 홀드 = 그날 지킨 리드 − 세이브.
 * 따로 된 난수를 써서 위에서 나눈 다른 기록은 그대로다.
 */
function splitSaves(seed: number, pitchers: RawPitcher[], pDays: (PitcherDay | null)[][]) {
  const R = mulberry32(seed + BULLPEN_SEED_OFFSET + 1)
  pitchers.forEach((p, i) => {
    if (p.SV === null) return
    const days = pDays[i]
    const units = days.flatMap((d, idx) => (d?.clutch ? Array<number>(lateHolds(d.clutch)).fill(idx) : []))
    for (const idx of takeDisjoint(units, [Math.min(p.SV, units.length)], R)[0]) days[idx]!.SV++
    for (const d of days) if (d?.clutch) d.HLD = allHolds(d.clutch) - d.SV
  })
}

// ---------- 기준 시즌 밖의 날: 실력(확률)으로 하루 경기 시뮬레이션 ----------

function poisson(lambda: number, R: Rand): number {
  const L = Math.exp(-lambda)
  let k = 0, p = 1
  do { k++; p *= R() } while (p > L)
  return k - 1
}

/** 이닝 구간 하나를 고른다 (share 합이 1보다 작으면 기회가 아닐 수 있다 → null) */
function drawPhase(share: InningCounts, R: Rand): Phase | null {
  let u = R()
  for (const ph of PHASES) {
    if (u < share[ph]) return ph
    u -= share[ph]
  }
  return null
}

function simHitterDay(h: RawHitter, rates: HitterRates, R: Rand): HitterDay | null {
  const G = Math.max(1, Math.min(SEASON_DAYS, h.clutch?.games ?? Math.round(h.PA / 4.3)))
  if (R() >= G / SEASON_DAYS) return null // 이날은 나오지 않음
  const mean = h.PA / G
  const nPA = Math.floor(mean) + (R() < mean - Math.floor(mean) ? 1 : 0)
  const d: HitterDay = { PA: nPA, BB: 0, HBP: 0, SO: 0, HR: 0, S1: 0, D2: 0, D3: 0, SB: 0, CS: 0, clutch: h.clutch ? { ...zeroHitterClutch(), games: 1 } : null }
  const onFirstBase = h.S1 + h.BB + h.HBP
  const attRate = onFirstBase > 0 ? (h.SB + h.CS) / onFirstBase : 0
  const succRate = h.SB + h.CS > 0 ? h.SB / (h.SB + h.CS) : 0.7
  const m = h.clutch ? hitterClutchParams(h, rates) : null
  const c = d.clutch
  for (let i = 0; i < nPA; i++) {
    let u = R(), k: 'BB' | 'HBP' | 'SO' | 'HR' | 'S1' | 'D2' | 'D3' | null = null
    if ((u -= rates.bb) < 0) k = 'BB'
    else if ((u -= rates.hbp) < 0) k = 'HBP'
    else if ((u -= rates.k) < 0) k = 'SO'
    else if ((u -= rates.hr) < 0) k = 'HR'
    else if (R() < rates.babip) {
      const x = R()
      k = x < rates.d3 ? 'D3' : x < rates.d3 + rates.d2 ? 'D2' : 'S1'
    }
    if (k) d[k]++
    if (k === 'S1' || k === 'BB' || k === 'HBP') {
      if (R() < attRate) d[R() < succRate ? 'SB' : 'CS']++
    }
    if (m && c) {
      // 타격 기회 (동점이거나 지고 있는 타석)와 그 결과
      const ph = drawPhase(m.batShare, R)
      if (ph) {
        c.battingChances[ph]++
        let v = R()
        for (const hk of HITTER_CLUTCH_HITS) {
          if ((v -= m.hitP[hk]) < 0) {
            c[hk][R() < m.winP(hk, ph) ? 'won' : 'lost'][ph]++
            break
          }
        }
      }
      // 1·2루 출루 → 접전 도루 기회
      if (k === 'S1' || k === 'D2' || k === 'BB' || k === 'HBP') {
        const sp = drawPhase(m.stealShare, R)
        if (sp) {
          c.stealChances[sp]++
          if (R() < m.stealP) {
            const side = R() < m.stealWinP ? 'won' : 'lost'
            c.steals[side][sp]++
            if (R() < m.runP + (side === 'won' ? 0.08 : -0.08)) c.stealRuns[side][sp]++
          }
        }
      }
    }
  }
  if (m && c && h.fielding.inn !== null) {
    // 수비 기회: 경기당 (수비 이닝/9 × 0.32) / 출장 경기
    const perGame = ((h.fielding.inn / 9) * m.defensePer9) / G
    for (let i = 0; i < 3; i++) {
      if (R() >= perGame / 3) continue
      const ph = drawPhase(normalize(m.defenseShare), R)!
      c.defenseChances[ph]++
      if (R() < m.defenseP) c.defensePlays[R() < m.defenseWinP ? 'won' : 'lost'][ph]++
    }
  }
  return d
}

const normalize = (s: InningCounts): InningCounts => {
  const t = s.early + s.late + s.extra
  return { early: s.early / t, late: s.late / t, extra: s.extra / t }
}

function simPitcherDay(p: RawPitcher, rates: PitcherRates, R: Rand): PitcherDay | null {
  const sp = p.role === 'SP'
  const G = Math.max(1, Math.round(p.outs / 3 / (sp ? 5.7 : 1.05)))
  if (R() >= Math.min(1, (p.clutch?.games ?? G) / SEASON_DAYS)) return null
  const mean = p.outs / G
  // 등판 길이: 선발은 평균의 75~125%, 불펜은 50~150%
  const target = Math.max(1, Math.round(mean * (sp ? 0.75 + 0.5 * R() : 0.5 + R())))
  const d: PitcherDay = { outs: 0, TBF: 0, SO: 0, BB: 0, HR: 0, HBP: 0, H: 0, ER: 0, SV: 0, HLD: 0, clutch: p.clutch ? { ...zeroPitcherClutch(), games: 1 } : null }
  while (d.outs < target && d.TBF < target * 3 + 12) {
    d.TBF++
    let u = R()
    if ((u -= rates.k) < 0) { d.SO++; d.outs++ }
    else if ((u -= rates.bb) < 0) d.BB++
    else if ((u -= rates.hbp) < 0) d.HBP++
    else if ((u -= rates.hr) < 0) { d.HR++; d.H++ }
    else if (R() < rates.babip) d.H++
    else d.outs++
  }
  // 자책점: 내준 출루·홈런으로 대략 (ERA 표시용 — 투수 WAR는 FIP 기준이라 가치에는 영향 없음)
  d.ER = poisson(Math.max(0, 0.8 * (0.5 * (d.H - d.HR) + 1.45 * d.HR + 0.33 * (d.BB + d.HBP) - 0.07 * d.outs)), R)
  const c = d.clutch
  if (c) {
    const m = pitcherClutchParams(p, rates)
    for (const ph of PHASES) {
      const n = poisson(m.crisisShare[ph], R)
      c.crisis[ph] += n
      for (let i = 0; i < n; i++) {
        if (R() >= m.escapeP) continue
        c.escapes[ph]++
        if (R() < m.lastKP) c.escapesLastK[ph]++
        if (R() < m.noBBP) c.escapesNoBB[ph]++
      }
      if (R() < m.leadShare[ph]) {
        if (R() < m.oneRunP) {
          c.leadApps1[ph]++
          if (R() < m.hold1P) c.leadHeld1[ph]++
        } else {
          c.leadAppsMulti[ph]++
          if (R() < m.holdMultiP) c.leadHeldMulti[ph]++
        }
      }
    }
  }
  return d
}

// ---------- 날짜별 기록 ----------

export type DemoSeason = {
  /** 날짜(YYYY-MM-DD)의 기록 = 그날까지 최근 144경기일의 합 */
  at(date: string): { hitters: RawHitter[]; pitchers: RawPitcher[] }
  /** 그날 선수가 치른 경기 (쉬었으면 null). 하루 변화 확인용 */
  dayOf(date: string, id: PlayerId): HitterDay | PitcherDay | null
}

export function createDemoSeason(
  seed: number,
  hitters: RawHitter[],
  pitchers: RawPitcher[],
  hitterRates: ReadonlyMap<PlayerId, HitterRates>,
  pitcherRates: ReadonlyMap<PlayerId, PitcherRates>,
): DemoSeason {
  const R = mulberry32(seed + 0x5ea5)
  const hDays = hitters.map((h) => splitHitter(h, R))
  const pDays = pitchers.map((p) => splitPitcher(p, R))
  splitSaves(seed, pitchers, pDays)
  const base = dayNumber(DEMO_BASE_DATE)
  const simCache = new Map<string, HitterDay | PitcherDay | null>()

  /** 기준일로부터 offset일 떨어진 날 선수 i의 경기: 기준 시즌 안이면 나눠 둔 경기, 밖이면 그날 시드로 시뮬레이션 */
  function game(i: number, offset: number): HitterDay | PitcherDay | null {
    const isH = i < hitters.length
    if (offset <= 0 && offset > -SEASON_DAYS) {
      const idx = SEASON_DAYS - 1 + offset
      return isH ? hDays[i][idx] : pDays[i - hitters.length][idx]
    }
    const key = `${i}:${offset}`
    if (simCache.has(key)) return simCache.get(key)!
    const r = mulberry32(mix(seed, i, offset))
    const g = isH
      ? simHitterDay(hitters[i], hitterRates.get(hitters[i].id)!, r)
      : simPitcherDay(pitchers[i - hitters.length], pitcherRates.get(pitchers[i - hitters.length].id)!, r)
    // 세이브·홀드는 따로 된 난수로 (다른 기록이 바뀌지 않게)
    const p = isH ? null : pitchers[i - hitters.length]
    if (p && p.SV !== null && g && 'outs' in g && g.clutch) Object.assign(g, daySaves(p, g.clutch, mulberry32(mix(seed + BULLPEN_SEED_OFFSET, i, offset))))
    if (simCache.size > 200_000) simCache.clear()
    simCache.set(key, g)
    return g
  }

  const cache = new Map<string, { hitters: RawHitter[]; pitchers: RawPitcher[] }>()

  function at(date: string) {
    const hit = cache.get(date)
    if (hit) return hit
    const end = dayNumber(date) - base
    const sumOf = <T extends object>(i: number, init: T): T => {
      for (let k = 0; k < SEASON_DAYS; k++) {
        const d = game(i, end - k)
        if (d) addInto(init as unknown as Record<string, unknown>, d as unknown as Record<string, unknown>)
      }
      return init
    }
    const hs = hitters.map((h, i) => ({
      ...h,
      ...sumOf<HitterDay>(i, { PA: 0, BB: 0, HBP: 0, SO: 0, HR: 0, S1: 0, D2: 0, D3: 0, SB: 0, CS: 0, clutch: h.clutch ? zeroHitterClutch() : null }),
    }))
    const ps = pitchers.map((p, i) => {
      const sum = sumOf<PitcherDay>(hitters.length + i, { outs: 0, TBF: 0, SO: 0, BB: 0, HR: 0, HBP: 0, H: 0, ER: 0, SV: 0, HLD: 0, clutch: p.clutch ? zeroPitcherClutch() : null })
      // 선발(세이브·홀드가 없는 투수)은 null 그대로
      return { ...p, ...sum, SV: p.SV === null ? null : sum.SV, HLD: p.HLD === null ? null : sum.HLD }
    })
    const out = { hitters: hs, pitchers: ps }
    if (cache.size > 16) cache.delete(cache.keys().next().value!)
    cache.set(date, out)
    return out
  }

  function dayOf(date: string, id: PlayerId) {
    const hi = hitters.findIndex((h) => h.id === id)
    const i = hi >= 0 ? hi : hitters.length + pitchers.findIndex((p) => p.id === id)
    return game(i, dayNumber(date) - base)
  }

  return { at, dayOf }
}

/** date에서 n일 뒤 날짜 */
export function addDays(date: string, n: number): string {
  return new Date((dayNumber(date) + n) * DAY_MS).toISOString().slice(0, 10)
}
