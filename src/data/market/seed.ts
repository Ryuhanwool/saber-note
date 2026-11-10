// 시연용 예시 판매글. 처음 열었을 때 팬 마켓이 비어 보이지 않게 하고, 경고(커스텀·마킹, 사기 의심) 시연용 글을 하나씩 둔다.
// 장타자·발 빠른 타자·삼진 투수(seedStars, 날짜와 상관없이 같은 선수)를 태그해 선수 카드·응원방에도 잡힌다.
import type { SeedMedia } from '../community/seed'
import type { MarketListing, RawHitter, RawPitcher } from '../types'
import { seedStars } from '../seedPlayers'

export type SeedListing = Omit<MarketListing, 'createdAt' | 'reports' | 'media'> & { ageMs: number; media: SeedMedia[] }

/** 예시 판매자 (가상의 다른 팬) */
export const DEMO_SELLERS = {
  otter: { id: 'demo-seller-1', name: '직관러 수달팬' },
  goat: { id: 'demo-seller-2', name: '산양응원단' },
  firefly: { id: 'demo-seller-3', name: '반딧불 모아요' },
  scam: { id: 'demo-seller-4', name: '급처왕' },
}

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR


/** 예시 사진: 책상 위에 펼쳐 둔 응원 타월 (SVG, 외부 파일 없이) */
function towelPhoto(): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" width="480" height="360">
  <rect width="480" height="360" fill="#C9B79C"/>
  <rect x="0" y="250" width="480" height="110" fill="#B5A386"/>
  <g transform="rotate(-6 240 170)">
    <rect x="70" y="110" width="340" height="120" rx="8" fill="#5B3A8C"/>
    <rect x="70" y="110" width="340" height="18" fill="#E8E4F2"/>
    <rect x="70" y="212" width="340" height="18" fill="#E8E4F2"/>
    <text x="240" y="185" text-anchor="middle" font-family="sans-serif" font-size="34" font-weight="700" fill="#E8E4F2">FIGHTING</text>
  </g>
  <text x="16" y="344" font-family="sans-serif" font-size="14" fill="#5A4E3C">데모 사진</text>
</svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

/** 리그 기록으로 예시 판매글을 만든다. 타자가 없으면 빈 목록 */
export function demoMarketSeeds(league: { hitters: readonly RawHitter[]; pitchers: readonly RawPitcher[] }): SeedListing[] {
  const { sluggers: [slugger, slugger2], runner, ace } = seedStars(league)
  if (!slugger) return []
  const { otter, goat, firefly, scam } = DEMO_SELLERS

  const seeds: SeedListing[] = [
    {
      // 경고 시연용: 「마킹」 → 사는 사람에게 "공식 마킹인지 확인하세요"
      id: 'demo-listing-1', ageMs: 50 * MIN, authorId: otter.id, sellerName: otter.name, category: 'uniform', players: [slugger.id],
      title: `${slugger.name} 홈 유니폼 (이름 마킹)`, price: 62_000, condition: '아주 좋음', caution: false, media: [],
      text: `구단 공식 스토어에서 산 ${slugger.name} 이름 마킹 홈 유니폼이에요. 두 번 입고 세탁해 뒀어요. 사이즈 100.`,
    },
    {
      // 사기 경고 시연용: 지나치게 싼 가격 + 선입금 + 외부 메신저
      id: 'demo-listing-2', ageMs: 2 * HOUR, authorId: scam.id, sellerName: scam.name, category: 'uniform', players: [slugger.id],
      title: `[사기 경고 시연용] ${slugger.name} 유니폼 급처`, price: 15_000, condition: '새 상품', caution: false, media: [],
      text: '급하게 처분해요. 선입금 해 주시면 바로 보내 드려요. 카톡 아이디 saber0000 으로 연락 주세요. (경고가 붙는 예시 판매글이에요)',
    },
  ]
  if (ace) {
    seeds.push({
      id: 'demo-listing-3', ageMs: 5 * HOUR, authorId: goat.id, sellerName: goat.name, category: 'towel', players: [ace.id],
      title: `${ace.name} 응원 타월`, price: 11_000, condition: '좋음', caution: false,
      text: `${ace.name} 등판 날마다 흔들던 공식 응원 타월이에요. 사진처럼 색 바램 없어요.`,
      media: [{ id: 'demo-listing-media-1', kind: '사진', type: 'image/svg+xml', name: '응원 타월.svg', blob: towelPhoto() }],
    })
  }
  if (runner) {
    seeds.push({
      id: 'demo-listing-4', ageMs: 1 * DAY + 3 * HOUR, authorId: firefly.id, sellerName: firefly.name, category: 'cap', players: [runner.id],
      title: `${runner.name} 사인 이벤트 모자`, price: 28_000, condition: '좋음', caution: false, media: [],
      text: '구단 팬 사인회 때 받은 공식 모자예요. 보관만 했어요.',
    })
  }
  if (slugger2) {
    seeds.push({
      id: 'demo-listing-5', ageMs: 3 * DAY, authorId: otter.id, sellerName: otter.name, category: 'keyring', players: [slugger2.id],
      title: `${slugger2.name} 등번호 키링`, price: 7_000, condition: '사용감 있음', caution: false, media: [],
      text: '가방에 달고 다녀서 살짝 긁힘 있어요. 공식 스토어 정품.',
    })
  }
  return seeds
}

/** 예시 판매글 → 저장할 판매글. 시각은 지금 기준으로 다시 맞추고, 이미 쌓인 신고는 그대로 둔다 */
export function seedToListing(seed: SeedListing, now: number, existing?: MarketListing): MarketListing {
  const { ageMs, media, ...rest } = seed
  return { ...rest, media: media.map(({ id, kind, type, name }) => ({ id, kind, type, name })), createdAt: now - ageMs, reports: existing?.reports ?? [] }
}
