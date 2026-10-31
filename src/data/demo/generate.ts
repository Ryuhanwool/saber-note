// 데모 HTML의 가상 리그 생성기를 옮긴 것.
// 데모와 같은 선수·기록이 나오도록 난수를 뽑는 순서를 그대로 지킨다. 줄 순서를 바꾸면 값이 달라진다.
// 출처가 원래 주는 값(원시 기록, 수비 구성 점수, DRS·OAA·ZR, 트래킹)만 만들고,
// wOBA·wRC+·FIP·UZR 합계·WAR 같은 계산은 domain이 한다.
import type { FieldPosition, PitcherRole, PlayerId, RawFielding, RawHitter, RawPitcher, RawRating } from '../types'
import { emptyFielding } from '../records'
import { clamp, gaussian, mulberry32, pick } from './random'

export const DEMO_SEED = 20261017

export const TEAMS = ['한빛 수달스', '태백 산양스', '청운 해오라기스', '금강 반딧불스', '남해 돌고래스', '북악 부엉이스']
const SUR = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍', '배', '노', '하', '문']
const GIV = ['도윤', '하준', '서진', '지호', '은찬', '태오', '시우', '민재', '건우', '유찬', '도현', '준서', '현우', '지훈', '승민', '재원', '한결', '우진', '성호', '태민', '윤호', '정우', '다온', '이안', '로운', '주원', '선우', '하람', '지성', '동하', '민혁', '규빈', '세찬', '찬영', '영재', '태경', '진혁', '상훈', '우석', '기현']
const POS: FieldPosition[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH']

/** 포지션별 수비 기회·범위·실책·병살 계수 */
const POSF: Record<Exclude<FieldPosition, 'DH'>, { rng: number; tc: number; err: number; dp: number }> = {
  C: { rng: 0.2, tc: 8.2, err: 0.5, dp: 0 },
  '1B': { rng: 0.5, tc: 9, err: 0.5, dp: 0.1 },
  '2B': { rng: 1, tc: 4.8, err: 1, dp: 1 },
  '3B': { rng: 1, tc: 2.8, err: 1.4, dp: 0.35 },
  SS: { rng: 1.3, tc: 4.5, err: 1.3, dp: 0.95 },
  LF: { rng: 0.8, tc: 2.1, err: 0.6, dp: 0 },
  CF: { rng: 1.3, tc: 2.7, err: 0.6, dp: 0 },
  RF: { rng: 0.8, tc: 2.2, err: 0.6, dp: 0 },
}

/** 타석 결과 확률 (진짜 실력). 6단계 주간 기록 시뮬레이션에서 쓴다. */
export type HitterRates = { bb: number; k: number; hr: number; hbp: number; babip: number; d2: number; d3: number }
export type PitcherRates = { k: number; bb: number; hr: number; hbp: number; babip: number }

export type DemoLeague = {
  hitters: RawHitter[]
  pitchers: RawPitcher[]
  hitterRates: Map<PlayerId, HitterRates>
  pitcherRates: Map<PlayerId, PitcherRates>
}

/** 생성 중에만 쓰는 숨은 값 (출처 밖으로 나가지 않음) */
type HitterTalent = {
  regular: boolean
  spd: number
  sbRate: number
  sbSucc: number
  dt: { rng: number; hands: number; arm: number; dp: number; frame: number; block: number; carm: number }
}

export function generateDemoLeague(seed = DEMO_SEED): DemoLeague {
  const R = mulberry32(seed)
  const rn = () => gaussian(R)
  const used = new Set<string>()
  const mkName = () => {
    let n: string
    do n = pick(SUR, R) + pick(GIV, R)
    while (used.has(n))
    used.add(n)
    return n
  }

  let nextId = 1
  const newId = (): PlayerId => `demo:${nextId++}`
  const hitters: RawHitter[] = []
  const pitchers: RawPitcher[] = []
  const hitterRates = new Map<PlayerId, HitterRates>()
  const pitcherRates = new Map<PlayerId, PitcherRates>()
  const talent = new Map<PlayerId, HitterTalent>()

  function mkHitter(team: string, pos: FieldPosition, regular: boolean) {
    const tP = rn(), tE = rn(), tC = rn(), tS = rn(), tD = rn()
    const spd = tS + (['SS', 'CF', '2B'].includes(pos) ? 0.6 : 0) - (['C', '1B', 'DH'].includes(pos) ? 0.6 : 0)
    const pw = tP + (['1B', 'DH', 'LF', 'RF'].includes(pos) ? 0.5 : 0) - (['SS', '2B', 'C'].includes(pos) ? 0.4 : 0)
    const PA = regular ? Math.round(clamp(540 + rn() * 55, 430, 640)) : Math.round(120 + R() * 170)
    const bb = clamp(0.085 + 0.022 * tE, 0.03, 0.17)
    const k = clamp(0.185 - 0.03 * tC + 0.012 * pw, 0.09, 0.3)
    const hr = clamp(0.026 + 0.013 * pw, 0.003, 0.07)
    const hbp = 0.011
    const babip = clamp(0.3 + 0.009 * tC + 0.012 * spd + 0.013 * rn(), 0.25, 0.37)
    const rates: HitterRates = { bb, k, hr, hbp, babip, d2: clamp(0.21 + 0.03 * pw, 0.12, 0.32), d3: clamp(0.015 + 0.012 * spd, 0, 0.06) }
    const BB = Math.round(PA * rates.bb), HBP = Math.round(PA * rates.hbp), SO = Math.round(PA * rates.k), HR = Math.round(PA * rates.hr)
    const BIP = PA - BB - HBP - SO - HR, Hb = Math.round(BIP * rates.babip)
    const D3 = Math.round(Hb * rates.d3), D2 = Math.round(Hb * rates.d2), S1 = Hb - D2 - D3
    const ev = clamp(139 + 4.2 * pw + 1.5 * rn(), 128, 152)
    // 아래부터는 데모의 객체 리터럴 속성 순서대로 난수를 뽑는다.
    const id = newId()
    const name = mkName()
    const age = 21 + Math.floor(R() * 15)
    const maxev = ev + clamp(30 + 4 * pw + 2 * rn(), 20, 45)
    const la = clamp(12 + 3 * pw + 3 * rn(), 2, 24)
    const hard = clamp(0.38 + 0.075 * pw + 0.02 * rn(), 0.18, 0.6)
    const barrel = clamp(0.07 + 0.035 * pw + 0.01 * rn(), 0.01, 0.2)
    const sprint = clamp(8.2 + 0.3 * spd + 0.08 * rn(), 7.3, 9.1)
    const dtRng = tD * 0.8 + 0.6 * rn() + (['SS', 'CF'].includes(pos) ? 0.3 : 0)
    const dt = { rng: dtRng, hands: rn(), arm: rn(), dp: rn(), frame: rn(), block: rn(), carm: rn() }
    const sbRate = clamp(0.06 + 0.05 * spd + 0.03 * rn(), 0.005, 0.3)
    const sbSucc = clamp(0.72 + 0.06 * spd + 0.05 * rn(), 0.45, 0.95)
    const xbt = clamp(0.4 + 0.08 * spd + 0.04 * rn(), 0.15, 0.75)

    hitterRates.set(id, rates)
    talent.set(id, { regular, spd, sbRate, sbSucc, dt })
    hitters.push({
      id, type: 'H', name, team, pos, age, PA, BB, HBP, SO, HR, S1, D2, D3,
      SB: 0, CS: 0, xbt, // SB·CS는 아래 후처리에서 채운다
      fielding: emptyFielding(),
      tracking: { ev, maxev, la, hard, barrel, xba: null, sprint, h2f: null },
    })
  }

  function mkPitcher(team: string, sp: boolean) {
    const tS = rn(), tC = rn(), tH = rn() * 0.6
    const outs = Math.round((sp ? 110 + R() * 75 : 45 + R() * 25) * 3), IP = outs / 3, TBF = Math.round(IP * 4.25)
    const rates: PitcherRates = {
      k: clamp(0.2 + 0.04 * tS + (sp ? 0 : 0.03), 0.11, 0.36),
      bb: clamp(0.08 - 0.016 * tC, 0.04, 0.14),
      hr: clamp(0.025 - 0.006 * tH - 0.003 * tS, 0.008, 0.045),
      hbp: 0.009,
      babip: clamp(0.295 + 0.015 * rn(), 0.25, 0.34),
    }
    const SO = Math.round(TBF * rates.k), BB = Math.round(TBF * rates.bb), HR = Math.round(TBF * rates.hr), HBP = Math.round(TBF * rates.hbp)
    const H = Math.round((TBF - SO - BB - HR - HBP) * rates.babip) + HR
    const fipCore = (13 * HR + 3 * (BB + HBP) - 2 * SO) / IP
    const ERA = clamp(fipCore + 3.1 + 0.35 * rn() + (rates.babip - 0.295) * 6, 2.0, 7.5)
    const mixNames = ['포심', '투심', '슬라이더', '커브', '체인지업', '포크']
    const fb = 0.38 + R() * 0.17
    const others = mixNames.slice(1).sort(() => R() - 0.5).slice(0, 3)
    const w = others.map(() => 0.2 + R())
    const ws = w.reduce((a, b) => a + b, 0)
    const mix = [{ pitch: '포심', share: fb }, ...others.map((pitch, i) => ({ pitch, share: ((1 - fb) * w[i]) / ws }))]
      .sort((a, b) => b.share - a.share)
    const id = newId()
    const name = mkName()
    const age = 21 + Math.floor(R() * 15)
    const ER = Math.round((ERA * IP) / 9)
    const velo = clamp(143 + 3.5 * tS + (sp ? 0 : 2.5) + rn(), 134, 156)
    const spin = Math.round(2250 + 110 * tS + 80 * rn())
    const whiff = clamp(0.24 + 0.045 * tS + 0.01 * rn(), 0.14, 0.38)
    const role: PitcherRole = sp ? 'SP' : 'RP'

    pitcherRates.set(id, rates)
    pitchers.push({ id, type: 'P', name, team, role, age, outs, TBF, SO, BB, HR, HBP, H, ER, tracking: { velo, spin, whiff, mix } })
  }

  for (const team of TEAMS) {
    for (const pos of POS) mkHitter(team, pos, true)
    mkHitter(team, pick(POS.slice(0, 8), R), false)
    for (let i = 0; i < 3; i++) mkPitcher(team, true)
    for (let i = 0; i < 2; i++) mkPitcher(team, false)
  }

  // 데모는 지표 계산 루프 안에서 수비·기대 타율·홈→1루 시간 난수를 뽑는다. 같은 순서로 뽑는다.
  for (const h of hitters) {
    const t = talent.get(h.id)!
    h.fielding = fieldingFor(h, t, rn)
    const AB = h.PA - h.BB - h.HBP
    const avg = (h.S1 + h.D2 + h.D3 + h.HR) / AB
    h.tracking.xba = clamp(avg + 0.015 * rn(), 0.18, 0.36)
    const onFirst = h.S1 + h.BB + h.HBP
    const att = Math.round(onFirst * t.sbRate)
    h.SB = Math.round(att * t.sbSucc)
    h.CS = att - h.SB
    h.tracking.h2f = clamp(4.3 + (8.2 - h.tracking.sprint!) * 0.5 + 0.04 * rn(), 3.9, 4.9)
  }

  return { hitters, pitchers, hitterRates, pitcherRates }
}

/** Math.round(-0.3)은 -0이 되어 "-0"으로 표시될 수 있으므로 0으로 바꾼다 */
const roundNoNegZero = (x: number) => Math.round(x) || 0

function fieldingFor(h: RawHitter, t: HitterTalent, rn: () => number): RawFielding {
  if (h.pos === 'DH') return emptyFielding()
  const f = POSF[h.pos], d = t.dt
  const C = h.pos === 'C', IF = ['1B', '2B', '3B', 'SS'].includes(h.pos), OF = ['LF', 'CF', 'RF'].includes(h.pos)
  const inn = t.regular ? clamp(h.PA * 2.1, 900, 1300) : h.PA * 1.6
  const k = inn / 1200
  const rngR = (d.rng * 4 + rn() * 1.5) * f.rng * k
  const errR = (d.hands * 1.2 + rn() * 0.6) * f.err * k
  const dpR = IF ? (d.dp * 1.6 + rn() * 0.5) * f.dp * k : null
  const armR = OF ? (d.arm * 2.2 + rn() * 0.8) * k : null
  let frmR: number | null = null, blkR: number | null = null, csp: number | null = null, csR: number | null = null
  if (C) {
    frmR = (d.frame * 1.5 + rn() * 0.5) * k
    blkR = (d.block * 1.5 + rn() * 0.5) * k
    csp = clamp(0.25 + 0.06 * d.carm + 0.03 * rn(), 0.1, 0.5)
    csR = (csp - 0.25) * 80 * k * 0.6
  }
  // DRS 잡음은 구성 요소 합계 위에 얹는다 (합계 계산은 domain이 같은 순서로 다시 한다)
  const uzr = rngR + errR + (dpR || 0) + (armR || 0) + (frmR || 0) + (blkR || 0) + (csR || 0)
  const drs = roundNoNegZero(uzr + rn() * 1.8)
  const oaa = C ? null : roundNoNegZero(rngR / 0.85 + rn())
  const zr = rngR + errR + (dpR || 0) + (armR || 0) + rn() * 1.2
  const TC = Math.round((inn / 9) * f.tc * (1 + 0.06 * d.rng))
  const E = Math.max(0, Math.round(TC * clamp(0.018 - 0.006 * d.hands, 0.003, 0.05) * f.err))
  const DP = IF ? Math.round((inn / 9) * f.dp * 0.9 * (1 + 0.08 * d.dp)) : null
  const A_OF = OF ? Math.max(0, Math.round(k * (5 + 2 * d.arm))) : null
  const g = (x: number) => clamp(Math.round((50 + 10 * x) / 5) * 5, 20, 80)
  const ratings: RawRating[] = (
    C
      ? [['포수 수비', g(d.block * 0.5 + d.frame * 0.5)], ['블로킹', g(d.block)], ['프레이밍', g(d.frame)], ['송구 강도', g(d.carm)]]
      : [['수비 범위', g(d.rng)], ['포구', g(d.hands)], ['송구 강도', g(d.arm)], ...(IF ? [['병살 처리', g(d.dp)]] : [])]
  ).map(([label, grade]) => ({ label: label as string, grade: grade as number }))
  return { inn, TC, E, DP, A_OF, rngR, errR, dpR, armR, frmR, blkR, csR, csp, drs, oaa, zr, ratings }
}
