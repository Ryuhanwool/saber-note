// 시연용 예시 글("데모 게시글"). 처음 열었을 때 커뮤니티가 비어 보이지 않게 한다.
// 리그 기록(홈런·도루·탈삼진 1위 등)으로 글을 만들어, 태그와 숫자가 리그 화면과 맞아떨어진다.
import type { CommunityPost, MediaRef, RawHitter, RawPitcher } from '../types'
import { DEMO_AUTHOR_ID } from '../types'

export type SeedMedia = MediaRef & { blob: Blob }

/**
 * 예시 글 하나. 작성 시각은 고정값 대신 "연 시각으로부터 얼마 전"(ageMs)으로 둔다.
 * reports는 처음 상태의 신고 기록이다 (신고 시연용 글은 2번 쌓인 채로 시작).
 */
export type SeedPost = Omit<CommunityPost, 'authorId' | 'createdAt' | 'likes' | 'media'> & {
  ageMs: number
  media: SeedMedia[]
}

/** 신고 시연용 글에 미리 쌓아 둘 신고자 (가상의 다른 시청자) */
export const DEMO_REPORTERS = ['demo-viewer-1', 'demo-viewer-2']

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** 예시 사진: 홈런 타구 궤적 그림 (SVG, 외부 파일 없이) */
function demoPhoto(caption: string): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
  <rect width="640" height="400" fill="#1d3b2a"/>
  <path d="M320 380 L60 150 Q320 -60 580 150 Z" fill="#2e6b4a"/>
  <path d="M320 380 L410 290 L320 200 L230 290 Z" fill="#b08a5a"/>
  <path d="M320 370 Q420 60 560 90" fill="none" stroke="#ffffff" stroke-width="5" stroke-dasharray="14 10" stroke-linecap="round"/>
  <circle cx="560" cy="90" r="12" fill="#ffffff" stroke="#c8102e" stroke-width="4"/>
  <text x="24" y="44" font-family="sans-serif" font-size="26" font-weight="700" fill="#ffffff">${caption}</text>
  <text x="24" y="378" font-family="sans-serif" font-size="16" fill="#cfe3d6">데모 이미지</text>
</svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

const topBy = <T>(xs: readonly T[], score: (x: T) => number, skip: readonly T[] = []) =>
  xs.filter((x) => !skip.includes(x)).reduce<T | undefined>((best, x) => (best === undefined || score(x) > score(best) ? x : best), undefined)

/** 리그 기록으로 예시 글 5개를 만든다. 타자가 없으면 빈 목록 */
export function demoCommunitySeeds(league: { hitters: readonly RawHitter[]; pitchers: readonly RawPitcher[] }): SeedPost[] {
  const { hitters, pitchers } = league
  const slugger = topBy(hitters, (h) => h.HR)
  const runner = topBy(hitters, (h) => h.SB, slugger ? [slugger] : [])
  const ace = topBy(pitchers, (p) => p.SO)
  if (!slugger) return []

  const seeds: SeedPost[] = [
    {
      id: 'demo-post-1', ageMs: 25 * MIN, masked: false, reports: [], players: [slugger.id],
      text: `${slugger.name} 벌써 홈런 ${slugger.HR}개! 어제 넘긴 타구 궤적 그려 봤어요. 올해 홈런왕 가능할까요?`,
      media: [{ id: 'demo-media-1', kind: '사진', type: 'image/svg+xml', name: '홈런 궤적.svg', blob: demoPhoto(`${slugger.name} 시즌 ${slugger.HR}호 홈런`) }],
    },
    {
      id: 'demo-post-2', ageMs: 3 * HOUR, masked: false, reports: [], players: [],
      text: 'wRC+ 처음 알았는데 100이 리그 평균이라는 게 제일 이해하기 쉽네요. 선수 카드에서 ⓘ 눌러 보세요.',
      media: [],
    },
    {
      // 신고 시연용: 다른 시청자 2명이 이미 신고했다. 한 번 더 신고하면 3번이 되어 가려진다
      id: 'demo-post-6', ageMs: 5 * HOUR, masked: false, reports: [...DEMO_REPORTERS], players: [],
      text: '[신고 시연용] 무료 중계 다시보기 모음 ▶▶ 쪽지 주시면 링크 드려요 ◀◀ (신고가 2번 쌓인 예시 글이에요. 신고를 누르면 3번이 되어 가려져요)',
      media: [],
    },
  ]
  if (runner) {
    seeds.push({
      id: 'demo-post-3', ageMs: 9 * HOUR, masked: false, reports: [], players: [runner.id],
      text: `${runner.name} 도루 ${runner.SB}개째. 주루 탭에서 주루 득점(BsR)까지 보니까 발로 만든 점수가 꽤 크네요.`,
      media: [],
    })
  }
  if (ace) {
    seeds.push({
      id: 'demo-post-4', ageMs: 1 * DAY + 2 * HOUR, masked: false, reports: [], players: [ace.id],
      text: `${ace.name} 시즌 탈삼진 ${ace.SO}개. ERA보다 FIP를 같이 봐야 투수 실력이 보인다는 게 이런 거군요.`,
      media: [],
    })
  }
  if (runner) {
    seeds.push({
      id: 'demo-post-5', ageMs: 3 * DAY, masked: false, reports: [], players: [slugger.id, runner.id],
      text: `${slugger.name} vs ${runner.name} 비교 화면으로 봤는데, 지표마다 앞서는 쪽이 달라서 재밌어요.`,
      media: [],
    })
  }
  return seeds
}

/**
 * 예시 글 → 저장할 글. 작성 시각은 지금 기준으로 다시 맞추고, 이미 저장된 좋아요·신고는 그대로 둔다.
 * existing이 없으면(처음이거나 시연 데이터 초기화) 처음 상태의 좋아요(없음)·신고로 시작한다.
 * (시연 날짜가 언제든 "25분 전", "3시간 전"처럼 보이고, "이번 주 많이 이야기된 선수"에도 잡힌다)
 */
export function seedToPost(seed: SeedPost, now: number, existing?: CommunityPost): CommunityPost {
  return {
    id: seed.id,
    authorId: DEMO_AUTHOR_ID,
    text: seed.text,
    players: seed.players,
    media: seed.media.map(({ id, kind, type, name }) => ({ id, kind, type, name })),
    createdAt: now - seed.ageMs,
    likes: existing?.likes ?? [],
    reports: existing?.reports ?? [...seed.reports],
    masked: seed.masked,
  }
}
