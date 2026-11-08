// 시연용 예시 응원("데모 응원"). 처음 열었을 때 응원방과 이번 주 응원 순위가 비어 보이지 않게 한다.
// 리그 기록(홈런·탈삼진·도루 1위 등)으로 만들어 선수 카드의 숫자와 맞아떨어진다.
import type { CheerEvent, CheerMessage, RawHitter, RawPitcher } from '../types'
import { DEMO_AUTHOR_ID } from '../types'

/** 작성 시각은 "연 시각으로부터 얼마 전"(ageMs)으로 둔다 */
export type SeedCheerMessage = Omit<CheerMessage, 'authorId' | 'authorName' | 'createdAt' | 'reports'> & { ageMs: number }
export type SeedCheer = Omit<CheerEvent, 'createdAt'> & { ageMs: number }
export type CheerSeeds = { messages: SeedCheerMessage[]; cheers: SeedCheer[] }

export const EMPTY_CHEER_SEEDS: CheerSeeds = { messages: [], cheers: [] }

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const ranked = <T>(xs: readonly T[], score: (x: T) => number) => [...xs].sort((a, b) => score(b) - score(a))

/**
 * 가상 시청자들의 「응원하기」 기록. week개는 최근 6.5일 안에, older개는 8~30일 전에 고르게 흩어 둔다
 * (누적 응원 수가 이번 주 응원 수보다 크게 보이도록). 시청자 한 명은 선수 한 명에게 한 번만 응원한다.
 */
function fanCheers(playerId: CheerEvent['playerId'], week: number, older: number): SeedCheer[] {
  const out: SeedCheer[] = []
  for (let k = 0; k < week; k++) out.push({ id: `demo-cheer-${playerId}-w${k}`, playerId, userId: `demo-fan-${k + 1}`, ageMs: Math.round((k + 0.5) * ((6.5 * DAY) / week)) })
  for (let k = 0; k < older; k++) out.push({ id: `demo-cheer-${playerId}-o${k}`, playerId, userId: `demo-fan-${week + k + 1}`, ageMs: 8 * DAY + Math.round(k * ((22 * DAY) / older)) })
  return out
}

/** 리그 기록으로 예시 응원 메시지와 응원 기록을 만든다. 타자가 없으면 빈 값 */
export function demoCheerSeeds(league: { hitters: readonly RawHitter[]; pitchers: readonly RawPitcher[] }): CheerSeeds {
  const [slugger, slugger2] = ranked(league.hitters, (h) => h.HR)
  if (!slugger) return EMPTY_CHEER_SEEDS
  const runner = ranked(league.hitters.filter((h) => h !== slugger && h !== slugger2), (h) => h.SB)[0]
  const ace = ranked(league.pitchers, (p) => p.SO)[0]
  const closer = ranked(league.pitchers.filter((p) => p.role === 'RP'), (p) => p.SO)[0]

  const messages: SeedCheerMessage[] = [
    { id: 'demo-cheer-msg-1', playerId: slugger.id, ageMs: 40 * MIN, caution: false, text: `${slugger.name} 홈런 ${slugger.HR}개! 이번 주도 담장 넘겨 주세요 💪` },
    // 허용되는 수준의 욕 예시 (「거친 표현 가리기」를 켜면 ●●로 보인다)
    { id: 'demo-cheer-msg-2', playerId: slugger.id, ageMs: 6 * HOUR, caution: false, text: '어제 그 홈런 씨발 아직도 소름 돋아요. 타석 들어올 때마다 설렘' },
    { id: 'demo-cheer-msg-3', playerId: slugger.id, ageMs: 2 * DAY, caution: false, text: '슬럼프 와도 끝까지 응원할게요. 화이팅!' },
  ]
  const cheers: SeedCheer[] = [...fanCheers(slugger.id, 14, 20)]
  if (ace) {
    messages.push(
      { id: 'demo-cheer-msg-4', playerId: ace.id, ageMs: 2 * HOUR, caution: false, text: `${ace.name} 탈삼진 ${ace.SO}개! 다음 등판도 응원합니다` },
      { id: 'demo-cheer-msg-5', playerId: ace.id, ageMs: 1 * DAY + 3 * HOUR, caution: false, text: '긴 이닝 던져 줘서 고마워요. 어깨 잘 챙기세요' },
    )
    cheers.push(...fanCheers(ace.id, 11, 15))
  }
  if (runner) {
    messages.push({ id: 'demo-cheer-msg-6', playerId: runner.id, ageMs: 5 * HOUR, caution: false, text: `${runner.name} 도루 ${runner.SB}개째, 뛰는 거 보는 맛에 야구 봐요` })
    cheers.push(...fanCheers(runner.id, 8, 6))
  }
  if (slugger2) {
    messages.push({ id: 'demo-cheer-msg-7', playerId: slugger2.id, ageMs: 1 * DAY, caution: false, text: `요즘 타구 질이 확실히 좋아졌어요. ${slugger2.name} 파이팅!` })
    cheers.push(...fanCheers(slugger2.id, 5, 9))
  }
  if (closer) {
    messages.push({ id: 'demo-cheer-msg-8', playerId: closer.id, ageMs: 2 * DAY + 4 * HOUR, caution: false, text: `9회는 ${closer.name}에게 맡깁니다` })
    cheers.push(...fanCheers(closer.id, 3, 2))
  }
  return { messages, cheers }
}

/** 예시 메시지 → 저장할 메시지. 작성 시각은 지금 기준으로 다시 맞추고, 이미 쌓인 신고는 그대로 둔다 */
export function seedToMessage(seed: SeedCheerMessage, now: number, existing?: CheerMessage): CheerMessage {
  return {
    id: seed.id, playerId: seed.playerId, authorId: DEMO_AUTHOR_ID, authorName: null, text: seed.text,
    createdAt: now - seed.ageMs, reports: existing?.reports ?? [], caution: seed.caution,
  }
}

export const seedToCheer = (seed: SeedCheer, now: number): CheerEvent =>
  ({ id: seed.id, playerId: seed.playerId, userId: seed.userId, createdAt: now - seed.ageMs })
