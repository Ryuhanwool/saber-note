import type {
  Account, LineupDraft, ProfileSnapshot, SeenKind, SavedLineup, CartLine, CheerMessage, CheerSnapshot, CommunityPost, CommunityUser, DisplaySettings, LeagueId, MarketListing, MarketSnapshot, MediaRef, NewAccount, NewCheerMessage, NewListing, NewPost, PlayerId, RawBattedBall, RawDataset, RawWeek,
} from './types'

/** 리그별 데이터 출처가 구현하는 인터페이스. ui는 registry를 거쳐서만 얻는다. */
export interface LeagueDataSource {
  readonly league: LeagueId
  /** 시즌 기록 전체. season을 생략하면 출처의 최신 시즌 (날짜별 기록을 주는 출처는 오늘(한국 시간) 기록) */
  load(season?: number): Promise<RawDataset>
  /**
   * 그 날짜(한국 날짜 YYYY-MM-DD)까지의 기록. meta.asOf가 그 날짜다.
   * 날짜별 기록을 주는 출처만 둔다 → 없으면 가치 순위표의 전일 비교·날짜 이동을 하지 않는다.
   */
  loadDay?(date: string): Promise<RawDataset>
  /** 타자 한 명의 타구 목록. 트래킹 데이터가 없으면 빈 배열 */
  loadBattedBalls(id: PlayerId): Promise<RawBattedBall[]>
  /**
   * 한 주 기록 (세이버 픽 챌린지 채점용). weekId는 "2026-W44" 같은 주차 이름.
   * 주간 기록을 주지 않는 출처는 이 함수를 두지 않는다 → 챌린지를 열지 않는다.
   */
  loadWeek?(weekId: string, ids: PlayerId[]): Promise<RawWeek>
}

/**
 * 커뮤니티 저장소. 브라우저 저장(7-1)과 서버(7-2, Supabase)가 같은 인터페이스를 구현한다.
 * ui는 registry의 openCommunityRepository로 얻는다.
 */
export interface CommunityRepository {
  /**
   * browser: 이 브라우저에만 저장(새로고침해도 남음), memory: 저장하지 못함(새로고침하면 사라짐),
   * shared: 서버에 저장되어 모두에게 보임
   */
  readonly storage: 'browser' | 'memory' | 'shared'
  /** 글을 쓰는 사람. 로그인이 필요한 저장소에서 로그인 전이면 null */
  currentUser(): Promise<CommunityUser | null>
  /** 모든 글, 최신순 */
  list(): Promise<CommunityPost[]>
  /** 글 목록이 바뀔 때마다 최신순 목록을 받는다. 반환값은 구독 해제 */
  subscribe(listener: (posts: CommunityPost[]) => void): () => void
  create(post: NewPost): Promise<CommunityPost>
  /** 현재 사용자의 좋아요를 켜고 끈다 */
  toggleLike(postId: string): Promise<void>
  /** 현재 사용자가 신고한다 (자기 글은 안 되고, 한 글에 한 번만) */
  report(postId: string): Promise<void>
  /** 자기 글만 지울 수 있다. 붙은 파일도 함께 지운다 */
  remove(postId: string): Promise<void>
  /** 파일을 보여 줄 주소. 파일이 없으면 null */
  mediaUrl(ref: MediaRef): Promise<string | null>
  /** 연결·파일 주소 정리 (있으면) */
  close?(): void
  /**
   * 시연 데이터 초기화 (있으면): 내가 쓴 글과 파일, 좋아요·신고 기록을 모두 지우고 예시 글을 처음 상태로 되돌린다.
   * 이 브라우저에만 저장하는 시연용 저장소에만 있다. 여럿이 함께 쓰는 서버 저장소에는 두지 않는다.
   */
  resetDemoData?(): Promise<void>
}

/**
 * 선수 응원방 저장소: 응원 메시지와 「응원하기」 기록. ui는 registry의 openCheerRepository로 연다.
 * 메시지 작성 제한 검사는 저장소에 넘기기 전에 domain(domain/cheer)이 한다.
 */
export interface CheerRepository {
  /** browser: 이 브라우저에만 저장, memory: 새로고침하면 사라짐, shared: 서버에 저장 */
  readonly storage: 'browser' | 'memory' | 'shared'
  currentUser(): Promise<CommunityUser | null>
  /** 모든 메시지(최신순)와 모든 「응원하기」 기록 */
  snapshot(): Promise<CheerSnapshot>
  /** 바뀔 때마다 새 상태를 받는다. 반환값은 구독 해제 */
  subscribe(listener: (s: CheerSnapshot) => void): () => void
  postMessage(message: NewCheerMessage): Promise<CheerMessage>
  /** 현재 사용자가 이 선수를 응원한다. 오늘(이 기기 날짜) 이미 응원했으면 AlreadyCheeredError */
  cheer(playerId: PlayerId): Promise<void>
  /** 현재 사용자가 신고한다 (자기 메시지는 안 되고, 한 메시지에 한 번만) */
  report(messageId: string): Promise<void>
  /** 자기 메시지만 지울 수 있다 */
  remove(messageId: string): Promise<void>
  close?(): void
  /** 시연 데이터 초기화 (있으면): 내가 쓴 메시지·응원·신고 기록을 지우고 예시 응원을 처음 상태로 되돌린다 */
  resetDemoData?(): Promise<void>
}

/** 오늘 이미 이 선수를 응원했을 때 */
export class AlreadyCheeredError extends Error {
  constructor() {
    super('오늘은 이미 이 선수를 응원했습니다.')
    this.name = 'AlreadyCheeredError'
  }
}

/**
 * 굿즈 마켓 저장소: 팬 마켓 판매글(사진 포함)과 장바구니. 공식 스토어 상품은 domain이 리그의 구단으로 만든다.
 * 판매 규칙·작성 제한 검사는 저장소에 넘기기 전에 domain(domain/market)이 한다. 결제는 시연용이라 저장소에 없다.
 */
export interface MarketRepository {
  readonly storage: 'browser' | 'memory' | 'shared'
  currentUser(): Promise<CommunityUser | null>
  /** 모든 판매글(최신순)과 장바구니 */
  snapshot(): Promise<MarketSnapshot>
  subscribe(listener: (s: MarketSnapshot) => void): () => void
  createListing(listing: NewListing): Promise<MarketListing>
  /** 현재 사용자가 신고한다 (자기 판매글은 안 되고, 한 판매글에 한 번만) */
  report(listingId: string): Promise<void>
  /** 자기 판매글만 지울 수 있다. 사진도 함께 지운다 */
  remove(listingId: string): Promise<void>
  /** 장바구니를 통째로 저장한다 (담기·빼기 규칙은 domain/market/cart) */
  saveCart(cart: CartLine[]): Promise<void>
  mediaUrl(ref: MediaRef): Promise<string | null>
  close?(): void
  /** 시연 데이터 초기화 (있으면): 내 판매글·사진·신고와 장바구니를 지우고 예시 판매글을 처음 상태로 되돌린다 */
  resetDemoData?(): Promise<void>
}

/**
 * 계정 저장소 (시연용 로그인). ui는 registry의 openAuthRepository로 연다.
 * 닉네임·비밀번호 규칙 검사는 넘기기 전에 domain(domain/auth)이 한다. 나중에 실제 로그인으로 바꿀 때 같은 인터페이스를 구현한다.
 */
export interface AuthRepository {
  /** browser: 이 브라우저에만 저장, memory: 새로고침하면 사라짐, shared: 서버 */
  readonly storage: 'browser' | 'memory' | 'shared'
  /** 비밀번호 해시(Web Crypto)를 쓸 수 있는지. false면 가입·로그인 대신 접속 주소 안내를 보여 준다 */
  readonly cryptoAvailable: boolean
  /** 로그인한 계정. 로그아웃 상태면 null */
  current(): Promise<Account | null>
  /** 로그인 상태가 바뀔 때마다 (다른 탭 포함). 반환값은 구독 해제 */
  subscribe(listener: (account: Account | null) => void): () => void
  /** 이 브라우저에 있는 모든 닉네임 (중복 검사용, 데모 계정 포함) */
  nicknames(): Promise<string[]>
  /** 가입하고 바로 로그인한다. 닉네임이 이미 있으면 NicknameTakenError */
  signUp(input: NewAccount): Promise<Account>
  /** 닉네임·비밀번호가 맞지 않으면 WrongCredentialsError */
  signIn(nickname: string, password: string): Promise<Account>
  /** 「데모 계정으로 체험하기」: 비밀번호 없이 데모 계정으로 로그인 */
  signInDemo(): Promise<Account>
  signOut(): Promise<void>
  close?(): void
  /** 시연 데이터 초기화 (있으면): accounts면 데모 계정을 뺀 계정을 모두 지우고 로그아웃한다. 아니면 아무것도 지우지 않는다 */
  resetDemoData?(opts: { accounts: boolean }): Promise<void>
}

export class NicknameTakenError extends Error {
  constructor() {
    super('이미 있는 닉네임입니다.')
    this.name = 'NicknameTakenError'
  }
}

export class WrongCredentialsError extends Error {
  constructor() {
    super('닉네임이나 비밀번호가 맞지 않습니다.')
    this.name = 'WrongCredentialsError'
  }
}

/** Web Crypto를 쓸 수 없는 접속(https·localhost가 아닌 주소)에서 가입·로그인하려 할 때 */
export class CryptoUnavailableError extends Error {
  constructor() {
    super('이 접속 주소에서는 비밀번호를 안전하게 처리할 수 없습니다. localhost나 https 주소로 접속해 주세요.')
    this.name = 'CryptoUnavailableError'
  }
}

/** 저장 공간이 모자라 저장하지 못했을 때 */
export class StorageFullError extends Error {
  constructor() {
    super('저장 공간이 가득 찼습니다.')
    this.name = 'StorageFullError'
  }
}

/**
 * 나만의 라인업 저장소: 계정마다 라인업 1개. 로그인한 계정만 저장할 수 있다. ui는 registry의 openLineupRepository로 연다.
 * 자리·타순 규칙 검사는 저장하기 전에 domain(domain/lineup)이 한다.
 */
export interface LineupRepository {
  /** browser: 이 브라우저에만 저장, memory: 새로고침하면 사라짐, shared: 서버 */
  readonly storage: 'browser' | 'memory' | 'shared'
  /** 로그인한 계정의 저장된 라인업. 로그아웃이거나 저장한 적이 없으면 null */
  mine(): Promise<SavedLineup | null>
  /** 내 라인업이 바뀔 때마다 (다른 탭 포함). 반환값은 구독 해제 */
  subscribe(listener: (mine: SavedLineup | null) => void): () => void
  /** 로그인한 계정의 라인업을 저장(덮어쓰기). 로그아웃 상태면 '로그인이 필요합니다' 오류 */
  save(lineup: LineupDraft): Promise<SavedLineup>
  close?(): void
  /** 시연 데이터 초기화 (있으면): 이 브라우저에 저장된 모든 계정의 라인업을 지운다 */
  resetDemoData?(): Promise<void>
}

/**
 * 홈 프로필 저장소: 계정마다 프로필 사진 1장과 「마지막으로 본 때」(새 소식·커뮤니티). ui는 registry의 openProfileRepository로 연다.
 * 사진은 로그인한 계정만 바꿀 수 있고, 마지막으로 본 때는 로그아웃 상태면 이 브라우저의 손님 기록에 둔다.
 * 사진 형식·크기 검사는 넘기기 전에 domain(domain/hub/profile)이 한다.
 */
export interface ProfileRepository {
  readonly storage: 'browser' | 'memory' | 'shared'
  snapshot(): Promise<ProfileSnapshot>
  /** 바뀔 때마다 (다른 탭 포함). 반환값은 구독 해제 */
  subscribe(listener: (s: ProfileSnapshot) => void): () => void
  /** null이면 기본 엠블럼으로. 로그아웃 상태면 '로그인이 필요합니다' 오류 */
  setImage(image: Blob | null): Promise<void>
  markSeen(kind: SeenKind, at: number): Promise<void>
  close?(): void
  /** 시연 데이터 초기화 (있으면): 이 브라우저의 모든 프로필 사진과 마지막으로 본 때를 지운다 */
  resetDemoData?(): Promise<void>
}

/** 화면 설정 저장소: 설정 값과 내 배경 이미지. ui는 registry의 openSettingsStore로 연다 */
export interface SettingsStore {
  /** 새로고침해도 남는지 (브라우저 저장소를 쓸 수 없으면 false) */
  readonly persistent: boolean
  /** 저장된 설정. 없거나 망가진 값은 기본값으로 채운다 */
  load(): Promise<DisplaySettings>
  save(settings: DisplaySettings): Promise<void>
  /** 내 배경 이미지. 없으면 null */
  loadBackground(): Promise<Blob | null>
  /** null이면 내 배경 이미지를 지운다 (기본 배경으로) */
  saveBackground(image: Blob | null): Promise<void>
}
