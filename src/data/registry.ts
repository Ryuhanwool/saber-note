import { createBrowserAuth } from './auth/browser'
import { createMemoryAuth } from './auth/memory'
import { createBrowserCheer } from './cheer/browser'
import { createMemoryCheer } from './cheer/memory'
import type { CheerSeeds } from './cheer/seed'
import { createBrowserCommunity } from './community/browser'
import { createBrowserMarket } from './market/browser'
import { createMemoryMarket } from './market/memory'
import type { SeedListing } from './market/seed'
import { createMemoryCommunity } from './community/memory'
import type { SeedPost } from './community/seed'
import { createBrowserSettings } from './settings/browser'
import { createMemorySettings } from './settings/memory'
import type { AuthRepository, CheerRepository, CommunityRepository, LeagueDataSource, MarketRepository, SettingsStore } from './source'
import type { LeagueId } from './types'
import { demoSource } from './demo'

// mlb(추가 1단계), kbo(데이터 확보 후)는 구현되면 여기에 등록한다.
const SOURCES: Partial<Record<LeagueId, LeagueDataSource>> = {
  demo: demoSource,
}

export const DEFAULT_LEAGUE: LeagueId = 'demo'

export function getDataSource(league: LeagueId = DEFAULT_LEAGUE): LeagueDataSource {
  const source = SOURCES[league]
  if (!source) throw new Error(`${league} 데이터 출처는 아직 구현되지 않았습니다.`)
  return source
}

/**
 * 커뮤니티 저장소 열기. 지금은 브라우저 저장(IndexedDB)이고, 쓸 수 없으면(사생활 보호 모드 등) 메모리 저장으로 바꾼다.
 * Supabase 연결(7-2) 후에는 여기서 서버 저장소를 고른다.
 */
export async function openCommunityRepository(opts: { seeds?: SeedPost[] } = {}): Promise<CommunityRepository> {
  if (typeof indexedDB !== 'undefined') {
    const browser = createBrowserCommunity({ seeds: opts.seeds })
    try {
      await browser.currentUser() // 저장소를 실제로 열어 본다
      return browser
    } catch {
      browser.close()
    }
  }
  return createMemoryCommunity({ seeds: opts.seeds })
}

/** 시연용 예시 글("데모 게시글")을 리그 기록으로 만든다 */
export { demoCommunitySeeds, type SeedPost } from './community/seed'

/** 선수 응원방 저장소 열기. 브라우저 저장(IndexedDB)을 쓸 수 없으면 메모리 저장으로 바꾼다 */
export async function openCheerRepository(opts: { seeds?: CheerSeeds } = {}): Promise<CheerRepository> {
  if (typeof indexedDB !== 'undefined') {
    const browser = createBrowserCheer({ seeds: opts.seeds })
    try {
      await browser.currentUser() // 저장소를 실제로 열어 본다
      return browser
    } catch {
      browser.close()
    }
  }
  return createMemoryCheer({ seeds: opts.seeds })
}

/** 시연용 예시 응원("데모 응원")을 리그 기록으로 만든다 */
export { demoCheerSeeds, type CheerSeeds } from './cheer/seed'

/** 굿즈 마켓 저장소 열기. 브라우저 저장(IndexedDB)을 쓸 수 없으면 메모리 저장으로 바꾼다 */
export async function openMarketRepository(opts: { seeds?: SeedListing[] } = {}): Promise<MarketRepository> {
  if (typeof indexedDB !== 'undefined') {
    const browser = createBrowserMarket({ seeds: opts.seeds })
    try {
      await browser.currentUser() // 저장소를 실제로 열어 본다
      return browser
    } catch {
      browser.close()
    }
  }
  return createMemoryMarket({ seeds: opts.seeds })
}

/** 시연용 예시 판매글을 리그 기록으로 만든다 */
export { demoMarketSeeds, DEMO_SELLERS, type SeedListing } from './market/seed'

/** 계정 저장소 열기 (시연용 로그인). 브라우저 저장(IndexedDB)을 쓸 수 없으면 메모리 저장으로 바꾼다 */
export async function openAuthRepository(): Promise<AuthRepository> {
  if (typeof indexedDB !== 'undefined') {
    const browser = createBrowserAuth()
    try {
      await browser.current() // 저장소를 실제로 열어 본다
      return browser
    } catch {
      browser.close()
    }
  }
  return createMemoryAuth()
}

/** 화면 설정 저장소 열기. 브라우저 저장소(localStorage·IndexedDB)를 쓸 수 없으면 메모리 저장으로 바꾼다 */
export async function openSettingsStore(): Promise<SettingsStore> {
  try {
    if (typeof indexedDB === 'undefined' || typeof localStorage === 'undefined') throw new Error('브라우저 저장소 없음')
    const store = createBrowserSettings()
    await store.load()
    await store.loadBackground() // 저장소를 실제로 열어 본다
    return store
  } catch {
    return createMemorySettings()
  }
}
