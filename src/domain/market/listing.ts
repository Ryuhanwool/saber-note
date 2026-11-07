// 팬 마켓 판매글 규칙: 판매 금지(차단), 커스텀·마킹(경고 후 선택), 사기 방지 경고, 작성 제한(커뮤니티와 같음), 사진 검사.
import type { GoodsCategory, ItemCondition, MarketListing, PlayerId } from '../../data/types'
import { moderate, type ModerationResult } from '../community/moderation'
import { ambiguousMessage, autoTag, blockMessage, postWaitMs } from '../community/posts'
import { CATEGORIES } from './catalog'

export const CONDITIONS: ItemCondition[] = ['새 상품', '아주 좋음', '좋음', '사용감 있음']
export const MAX_TITLE_LENGTH = 40
export const MAX_LISTING_TEXT = 500
export const MAX_PHOTOS = 4
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
export const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const MIN_PRICE = 1_000
export const MAX_PRICE = 5_000_000
/** 기준 시세의 이 비율보다 싸면 "지나치게 싼 가격" 경고 */
export const LOW_PRICE_RATIO = 0.4

/** 화면에 늘 보이는 판매 규칙 */
export const SALE_RULES = [
  '선수 관련 공식 굿즈만 팔 수 있어요.',
  '선수 사진이나 구단 로고를 넣어 직접 만든 비공식 상품은 팔 수 없어요.',
  '티켓·입장권 되팔기는 할 수 없어요.',
  '선입금 요구, 외부 메신저 연락처, 시세보다 지나치게 싼 가격은 「주의」로 표시돼요. 거래는 앱 안에서 해 주세요.',
]

// 낱말은 띄어쓰기를 지우고 소문자로 바꾼 글에서 찾는다 ("직접 제작" = "직접제작")
const squash = (s: string) => s.toLowerCase().replace(/\s+/g, '')

/** 판매 금지: 티켓 되팔기 */
export const TICKET_WORDS = ['티켓', '입장권', '좌석양도', '표양도', '암표', '예매대행', '직관양도', '시즌권']
/** 판매 금지: 직접 만든 비공식 상품 */
export const UNOFFICIAL_WORDS = ['직접제작', '직접만든', '직접만들', '자체제작', '비공식']
/** 경고 후 선택: 공식 마킹 유니폼일 수 있다 */
export const CUSTOM_WORDS = ['커스텀', '마킹']
/** 사기 경고: 선입금 요구 */
export const PREPAY_WORDS = ['선입금', '입금먼저', '먼저입금', '송금먼저', '먼저송금', '입금후발송', '입금확인후', '계좌']
/** 사기 경고: 외부 메신저 연락처 */
export const CONTACT_WORDS = ['카톡', '카카오톡', '오픈채팅', '오픈톡', 'open.kakao', 'kakao', '텔레그램', 'telegram', 't.me/', '라인아이디', '라인id', 'lineid', '디엠', 'dm주세요', '인스타']

const found = (text: string, words: readonly string[]) => {
  const t = squash(text)
  return words.filter((w) => t.includes(squash(w)))
}

export type BanReason = '티켓 되팔기' | '비공식 상품'
export type WarningKind = '지나치게 싼 가격' | '선입금 요구' | '외부 메신저 연락처' | '커스텀·마킹'
export type ListingWarning = { kind: WarningKind; message: string }

/** 판매 금지 낱말 (제목 + 설명). 하나라도 있으면 올릴 수 없다 */
export function bannedReasons(text: string): { reason: BanReason; words: string[] }[] {
  const out: { reason: BanReason; words: string[] }[] = []
  const ticket = found(text, TICKET_WORDS)
  if (ticket.length) out.push({ reason: '티켓 되팔기', words: ticket })
  const unofficial = found(text, UNOFFICIAL_WORDS)
  if (unofficial.length) out.push({ reason: '비공식 상품', words: unofficial })
  return out
}

/** 기준 시세보다 지나치게 싼지 (기타 종류는 시세가 없어 보지 않는다) */
export function isSuspiciouslyCheap(category: GoodsCategory, price: number): boolean {
  const ref = CATEGORIES[category].officialPrice
  return ref !== null && price < ref * LOW_PRICE_RATIO
}

/**
 * 판매글의 경고 (글쓴이는 올리기 전에, 사는 사람은 판매글의 「주의」 배지로 본다).
 * 판매글에 저장하지 않고 읽을 때마다 계산한다 (규칙이 바뀌어도 예전 글에 바로 적용된다).
 */
export function listingWarnings(l: Pick<MarketListing, 'title' | 'text' | 'category' | 'price'>): ListingWarning[] {
  const text = `${l.title}\n${l.text}`
  const out: ListingWarning[] = []
  if (isSuspiciouslyCheap(l.category, l.price)) {
    const ref = CATEGORIES[l.category].officialPrice!
    out.push({ kind: '지나치게 싼 가격', message: `${CATEGORIES[l.category].label} 기준 시세(${ref.toLocaleString('ko-KR')}원)보다 지나치게 싼 가격이에요` })
  }
  const prepay = found(text, PREPAY_WORDS)
  if (prepay.length) out.push({ kind: '선입금 요구', message: `선입금을 요구하는 표현이 있어요(${prepay.join(', ')})` })
  const contact = found(text, CONTACT_WORDS)
  if (contact.length) out.push({ kind: '외부 메신저 연락처', message: `외부 메신저 연락처가 있어요(${contact.join(', ')})` })
  const custom = found(text, CUSTOM_WORDS)
  if (custom.length) out.push({ kind: '커스텀·마킹', message: `「${custom.join('·')}」 상품이에요. 구단 공식 마킹인지 확인하세요` })
  return out
}

export type FileInfo = { name: string; type: string; size: number }

/** 사진 검사: PNG·JPG·WEBP, 장당 10MB, 최대 4장 */
export function checkPhotos(currentCount: number, files: readonly FileInfo[]): { accepted: number[]; errors: string[] } {
  const accepted: number[] = []
  const errors: string[] = []
  files.forEach((f, i) => {
    if (!PHOTO_TYPES.includes(f.type)) errors.push(`${f.name}: PNG, JPG, WEBP 사진만 올릴 수 있어요`)
    else if (f.size > MAX_PHOTO_BYTES) errors.push(`${f.name}: 10MB를 넘어요`)
    else if (currentCount + accepted.length >= MAX_PHOTOS) errors.push(`사진은 ${MAX_PHOTOS}장까지 올릴 수 있어요`)
    else accepted.push(i)
  })
  return { accepted, errors: [...new Set(errors)] }
}

export type ListingDraft = {
  title: string
  text: string
  category: GoodsCategory
  /** 입력한 가격 (숫자가 아니면 NaN) */
  price: number
  condition: ItemCondition
  players: readonly PlayerId[]
  photoCount: number
  /** 판매 규칙에 동의했는지 */
  agreed: boolean
  /** 경고(사기 의심, 커스텀·마킹, 애매한 표현)를 보고도 「그래도 올리기」를 골랐는지 */
  confirmWarnings?: boolean
}

export type PreparedListing =
  | { ok: true; title: string; text: string; players: PlayerId[]; price: number; caution: boolean; warnings: ListingWarning[] }
  | {
      ok: false
      reason: 'no-title' | 'too-long' | 'no-player' | 'bad-price' | 'too-many-photos' | 'not-agreed' | 'banned' | 'blocked' | 'needs-confirm' | 'too-soon'
      message: string
      /** needs-confirm일 때 보여 줄 경고 목록 */
      warnings?: string[]
      moderation?: ModerationResult
    }

/**
 * 판매글 하나를 올리기 전 검사. 순서: 입력 → 동의 → 판매 금지(차단) → 작성 제한 차단 → 경고(확인 필요) → 도배 제한.
 * 선수 태그는 직접 단 태그 + 제목·설명에 나온 선수 이름이고, 하나 이상 있어야 한다(선수 관련 굿즈만).
 */
export function prepareListing(
  d: ListingDraft,
  ctx: { players: readonly { id: PlayerId; name: string }[]; lastPostAt: number | null; now: number },
): PreparedListing {
  const title = d.title.trim()
  const text = d.text.trim()
  if (!title) return { ok: false, reason: 'no-title', message: '상품 이름을 써 주세요.' }
  if (title.length > MAX_TITLE_LENGTH || text.length > MAX_LISTING_TEXT) {
    return { ok: false, reason: 'too-long', message: `상품 이름은 ${MAX_TITLE_LENGTH}자, 설명은 ${MAX_LISTING_TEXT}자까지 쓸 수 있어요.` }
  }
  const players = autoTag(`${title}\n${text}`, d.players, ctx.players)
  if (!players.length) return { ok: false, reason: 'no-player', message: '어느 선수 굿즈인지 선수 태그를 달아 주세요.' }
  if (!Number.isInteger(d.price) || d.price < MIN_PRICE || d.price > MAX_PRICE) {
    return { ok: false, reason: 'bad-price', message: `가격은 ${MIN_PRICE.toLocaleString('ko-KR')}원부터 ${MAX_PRICE.toLocaleString('ko-KR')}원까지 숫자로 써 주세요.` }
  }
  if (d.photoCount > MAX_PHOTOS) return { ok: false, reason: 'too-many-photos', message: `사진은 ${MAX_PHOTOS}장까지 올릴 수 있어요.` }
  if (!d.agreed) return { ok: false, reason: 'not-agreed', message: '판매 규칙을 읽고 동의해 주세요.' }

  const all = `${title}\n${text}`
  const banned = bannedReasons(all)
  if (banned.length) {
    return {
      ok: false, reason: 'banned',
      message: `판매할 수 없는 상품이에요. ${banned.map((b) => `${b.reason}(${b.words.join(', ')})`).join(' / ')}. 공식 굿즈만 팔 수 있어요.`,
    }
  }
  const moderation = moderate(all, { names: ctx.players.map((p) => p.name) })
  if (moderation.level === 'block') return { ok: false, reason: 'blocked', message: blockMessage(moderation), moderation }

  const warnings = listingWarnings({ title, text, category: d.category, price: d.price })
  const notes = warnings.map((w) => w.message)
  if (moderation.level === 'ambiguous') notes.push(ambiguousMessage(moderation).split('. 고쳐 쓰거나')[0])
  if (notes.length && !d.confirmWarnings) {
    return { ok: false, reason: 'needs-confirm', message: '올리기 전에 확인해 주세요. 그래도 올리면 사는 사람에게 「주의」로 보여요.', warnings: notes, moderation }
  }
  const waitMs = postWaitMs(ctx.lastPostAt, ctx.now)
  if (waitMs > 0) {
    return { ok: false, reason: 'too-soon', message: `도배를 막기 위해 30초에 한 번만 판매글을 올릴 수 있어요. ${Math.ceil(waitMs / 1000)}초 뒤에 다시 올려 주세요.` }
  }
  return { ok: true, title, text, players, price: d.price, caution: moderation.level === 'ambiguous', warnings }
}

/** 이 선수 관련 판매글 (태그가 달렸거나 제목·설명에 이름이 나온다), 최신순 */
export const playerListings = (listings: readonly MarketListing[], player: { id: PlayerId; name: string }) =>
  listings
    .filter((l) => l.players.includes(player.id) || l.title.includes(player.name) || l.text.includes(player.name))
    .sort((a, b) => b.createdAt - a.createdAt)

/** 이 사용자가 마지막으로 올린 판매글 시각 (도배 제한용) */
export function lastListingAt(listings: readonly MarketListing[], userId: string): number | null {
  const mine = listings.filter((l) => l.authorId === userId)
  return mine.length ? Math.max(...mine.map((l) => l.createdAt)) : null
}
