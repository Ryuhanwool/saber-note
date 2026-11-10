// data 층이 넘기는 원시 데이터의 모양. domain은 이 파일만 import할 수 있다.
//
// 값 없음 규칙: 해당하지 않거나 모르는 값은 언제나 null로 넣는다. undefined나 빠진 필드는 쓰지 않는다.
// 그래서 아래 필드에는 `?`(선택 필드)를 쓰지 않는다. 필드를 빠뜨리면 타입 오류가 난다.

export type LeagueId = 'demo' | 'mlb' | 'kbo'
/** 리그 간 충돌을 막기 위해 `리그:번호` 형식으로 쓴다. 예: `kbo:123` */
export type PlayerId = `${LeagueId}:${number}`

export type FieldPosition = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH'
export type PitcherRole = 'SP' | 'RP'

/** 값이 없으면 null */
export type Num = number | null

export type RawRating = { label: string; grade: number }

/**
 * 수비 기록. 지명타자는 모든 항목이 null이다.
 * 포지션에 해당하지 않는 항목도 null이다 (예: 외야수의 dpR·DP, 포수가 아닌 선수의 csp).
 */
export type RawFielding = {
  /** 수비 이닝 */
  inn: Num
  /** 수비 기회(자살+보살+실책) — 수비율·레인지 팩터 계산용 */
  TC: Num
  /** 실책 */
  E: Num
  /** 병살 처리 (내야수) */
  DP: Num
  /** 보살 (외야수) */
  A_OF: Num
  // UZR 구성 요소 (득점)
  rngR: Num
  errR: Num
  dpR: Num
  armR: Num
  frmR: Num
  blkR: Num
  csR: Num
  /** 도루 저지율 (포수) */
  csp: Num
  // 출처가 직접 주는 종합 수비 지표
  drs: Num
  oaa: Num
  zr: Num
  /** 20~80 스카우팅 능력치 */
  ratings: RawRating[] | null
}

export type RawHitterTracking = {
  /** 평균 타구 속도 km/h */
  ev: Num
  maxev: Num
  /** 평균 발사각 ° */
  la: Num
  hard: Num
  barrel: Num
  /** 기대 타율 (출처 제공값) */
  xba: Num
  /** 스프린트 스피드 m/s */
  sprint: Num
  /** 홈→1루 시간 초 */
  h2f: Num
}

/** 이닝 구간별 횟수: 1~6회(early), 7~9회(late), 연장(extra) */
export type InningCounts = { early: number; late: number; extra: number }

/** 타자 클러치 기록은 팀이 이긴 경기와 진 경기로 나눈다 */
export type WinLossCounts = { won: InningCounts; lost: InningCounts }

/**
 * 타자의 경기 상황별(클러치) 기록. 「기회」는 그 일이 일어날 수 있었던 횟수로, 리그 평균 기대 점수 계산에 쓴다.
 * 「접전」은 동점이거나 1~2점 차인 상황이다.
 */
export type RawHitterClutch = {
  /** 출장 경기 수 */
  games: number
  /** 타격 기회: 동점이거나 지고 있을 때의 타석 */
  battingChances: InningCounts
  /** 역전타: 지거나 비기던 경기를 앞서게 만든 안타 */
  goAhead: WinLossCounts
  /** 동점타 */
  tying: WinLossCounts
  /** 추격타: 득점했지만 여전히 지고 있는 안타. 안타 뒤 남은 점수 차가 1점·2점·3점 이상 */
  chase1: WinLossCounts
  chase2: WinLossCounts
  chase3: WinLossCounts
  /** 도루 기회: 접전에서 1·2루 주자로 나간 횟수 */
  stealChances: InningCounts
  /** 접전 도루 성공 */
  steals: WinLossCounts
  /** 접전 도루에 성공한 그 주자가 득점한 횟수 */
  stealRuns: WinLossCounts
  /** 수비 기회: 접전에서 득점권 주자가 있을 때 자기에게 온 타구 (지명타자는 0) */
  defenseChances: InningCounts
  /** 그 기회에 실점을 막은 호수비·보살 */
  defensePlays: WinLossCounts
}

/**
 * 투수의 경기 상황별(클러치) 기록. 선발·불펜 구분 없이 같은 항목이다.
 * 「위기」는 득점권 주자가 있고 점수 차가 2점 이내(동점 포함)인 상황이다.
 */
export type RawPitcherClutch = {
  /** 등판 경기 수 */
  games: number
  /** 위기 등판(위기를 맞은 횟수) */
  crisis: InningCounts
  /** 위기를 실점 없이 벗어난 횟수 */
  escapes: InningCounts
  /** 그중 마지막 아웃을 삼진으로 잡은 횟수 */
  escapesLastK: InningCounts
  /** 그중 볼넷 없이 막은 횟수 */
  escapesNoBB: InningCounts
  /** 1점 차 리드 상황 등판과 리드를 지킨 채 내려가거나 경기를 끝낸 횟수 */
  leadApps1: InningCounts
  leadHeld1: InningCounts
  /** 2점 차 이상 리드 상황 등판과 리드를 지킨 횟수 */
  leadAppsMulti: InningCounts
  leadHeldMulti: InningCounts
}

export type RawHitter = {
  id: PlayerId
  type: 'H'
  name: string
  team: string
  pos: FieldPosition
  age: number
  PA: number
  BB: number
  HBP: number
  SO: number
  HR: number
  S1: number
  D2: number
  D3: number
  SB: number
  CS: number
  /** 추가 진루율 (안타 때 한 베이스 더 간 비율) */
  xbt: Num
  fielding: RawFielding
  tracking: RawHitterTracking
  /** 경기 상황별 기록. 출처에 없으면 null */
  clutch: RawHitterClutch | null
}

export type RawPitchMix = { pitch: string; share: number }

export type RawPitcherTracking = {
  /** 평균 직구 구속 km/h */
  velo: Num
  spin: Num
  whiff: Num
  mix: RawPitchMix[] | null
}

export type RawPitcher = {
  id: PlayerId
  type: 'P'
  name: string
  team: string
  role: PitcherRole
  age: number
  /** 잡은 아웃 수 (이닝 × 3) */
  outs: number
  TBF: number
  SO: number
  BB: number
  HR: number
  HBP: number
  H: number
  ER: number
  /**
   * 세이브·홀드 (불펜 투수만, 선발은 null. 출처에 없으면 null).
   * 세이브 = 7회 이후 리드를 지킨 등판 중 9회를 맡아 경기를 끝낸 것, 홀드 = 나머지 리드를 지킨 등판
   */
  SV: Num
  HLD: Num
  tracking: RawPitcherTracking
  /** 경기 상황별 기록. 출처에 없으면 null */
  clutch: RawPitcherClutch | null
}

export type RawBattedBall = { ev: number; la: number; hit: boolean }

/** 한 주 동안의 타격 기록 (세이버 픽 챌린지 채점용) */
export type RawWeeklyHitting = {
  id: PlayerId
  PA: number; BB: number; HBP: number; SO: number; HR: number; S1: number; D2: number; D3: number
}

/** 한 주 동안의 투구 기록 (선발 등판 기준) */
export type RawWeeklyPitching = {
  id: PlayerId
  /** 선발 등판 수 */
  GS: number
  outs: number; SO: number; BB: number; HBP: number; HR: number
}

export type RawWeek = { hitters: RawWeeklyHitting[]; pitchers: RawWeeklyPitching[] }

/** 리그·기준마다 다른 계산 상수. domain은 이 값을 받아서만 계산한다. */
export type LeagueConstants = {
  woba: { bb: number; hbp: number; s1: number; d2: number; d3: number; hr: number }
  wobaScale: number
  /** 리그 타석당 득점 (wRC+ 기준) */
  runsPerPA: number
  /** 600타석당 포지션 보정 득점 */
  positionAdjust: Record<FieldPosition, number>
  /** 도루 성공·실패 득점 가치 */
  runSB: number
  runCS: number
  /** 600타석당 대체 선수 득점 */
  replacementRunsPer600: number
  /** 대체 선수 투수의 FIP = 리그 ERA + 이 값 */
  replacementFipGap: number
  runsPerWin: number
  /** 백분위·리그 평균 대상이 되는 최소 타석 */
  qualifiedPA: number
}

export type DatasetMeta = {
  league: LeagueId
  season: number
  /** 화면 상단 시즌 표기. 예: "가상 리그 2026", "KBO 2026" */
  seasonLabel: string
  /** 화면의 계산 기준 표기. 예: "스탯티즈 기준" */
  basisLabel: string
  /** 기록 반영일 (YYYY-MM-DD). 모르면 null */
  asOf: string | null
  source: string
  /** 화면 상단 안내 문구. 없으면 null */
  notice: string | null
  /**
   * 불펜 역할(마무리·중간)과 가상 팬 라인업을 정하는 기준 날짜. 이 날짜 기록으로 한 번 정해 고정한다.
   * 날짜별 기록이 없는 출처는 null (그때는 지금 기록으로 정한다)
   */
  roleBasisDate: string | null
  /** 이 출처가 어떤 기록을 제공하는지. 탭·지표 줄을 보여 줄지는 domain이 이 값으로 정한다 */
  available: DataAvailability
}

/**
 * 출처가 제공하는 기록 목록 (필드 하나하나 있음/없음).
 * - false: 이 출처에는 그 기록이 아예 없다 → 모든 선수의 값이 null이어야 하고, 화면에서 그 지표 줄을 숨긴다.
 * - true: 기록이 있다. 그래도 해당하지 않는 선수는 null일 수 있다(예: 지명타자의 수비) → 줄은 보이고 "기록 없음"으로 표시.
 * 타석·안타·이닝 같은 기본 기록은 언제나 있다고 본다.
 */
export type DataAvailability = {
  xbt: boolean
  fielding: Record<keyof RawFielding, boolean>
  hitterTracking: Record<keyof RawHitterTracking, boolean>
  pitcherTracking: Record<keyof RawPitcherTracking, boolean>
  /** loadBattedBalls가 타구 목록을 주는지 */
  battedBalls: boolean
  /** 경기 상황별(클러치) 기록을 주는지. 없으면 선수 가치의 클러치 부분을 숨긴다 */
  clutch: boolean
  /** 불펜 투수의 세이브·홀드를 주는지 */
  saves: boolean
}

export type RawDataset = {
  meta: DatasetMeta
  constants: LeagueConstants
  hitters: RawHitter[]
  pitchers: RawPitcher[]
}

// ---------- 커뮤니티 ----------

export type MediaKind = '사진' | '움짤' | '영상'

/** 글에 붙은 파일. 파일 자체는 저장소가 따로 보관하고 mediaUrl로 주소를 얻는다 */
export type MediaRef = { id: string; kind: MediaKind; type: string; name: string }

export type CommunityUser = { id: string; name: string }

export type CommunityPost = {
  id: string
  authorId: string
  /** 쓸 때의 닉네임. 예시 글과 로그인 기능 전에 쓴 글은 null */
  authorName: string | null
  /** 게시된 본문 (거친 표현은 이미 ●로 가려진 상태) */
  text: string
  /** 선수 태그 (직접 단 태그 + 본문 속 선수 이름 자동 태그) */
  players: PlayerId[]
  media: MediaRef[]
  /** 작성 시각 (ms) */
  createdAt: number
  /** 좋아요·신고한 사용자 id */
  likes: string[]
  reports: string[]
  /** 예전 방식(쓸 때 ●로 바꿔 저장)으로 가린 글인지. 지금은 원문을 저장하고 화면에 보일 때 가린다 */
  masked: boolean
  /** 「주의」: 애매하다는 경고를 받고도 그대로 올린 글 (걸린 표현은 늘 ●●로 가린다) */
  caution: boolean
}

export type NewMedia = { blob: Blob; kind: MediaKind; name: string }

/** 저장소에 넘기는 새 글. 작성 제한 검사·가림·자동 태그는 넘기기 전에 끝낸다 (domain/community) */
export type NewPost = { text: string; players: PlayerId[]; masked: boolean; caution: boolean; files: NewMedia[] }

/** 시연용 예시 글("데모 게시글")의 작성자 id. 이 id의 글은 아무도 지울 수 없다 */
export const DEMO_AUTHOR_ID = 'demo'

// ---------- 응원방 ----------

/** 선수 응원방의 응원 메시지 (글만, 사진 없음) */
export type CheerMessage = {
  id: string
  playerId: PlayerId
  authorId: string
  /** 쓸 때의 닉네임. 예시 응원과 로그인 기능 전에 쓴 메시지는 null */
  authorName: string | null
  /** 원문 (거친 표현은 화면에 보일 때 가린다) */
  text: string
  createdAt: number
  /** 신고한 사용자 id */
  reports: string[]
  /** 「주의」: 애매하다는 경고를 받고도 그대로 올린 메시지 */
  caution: boolean
}

/** 「응원하기」 한 번 (한 사람이 선수 한 명에게 하루 1번) */
export type CheerEvent = { id: string; playerId: PlayerId; userId: string; createdAt: number }

/** 저장소에 넘기는 새 응원 메시지. 작성 제한 검사는 넘기기 전에 끝낸다 (domain/cheer) */
export type NewCheerMessage = { playerId: PlayerId; text: string; caution: boolean }

/** 응원방 전체 상태: 모든 메시지(최신순)와 모든 「응원하기」 기록 */
export type CheerSnapshot = { messages: CheerMessage[]; cheers: CheerEvent[] }

// ---------- 굿즈 마켓 ----------

/** 상품 종류 (공식 스토어 상품과 팬 마켓 판매글이 같이 쓴다. 기타는 기준 시세가 없다) */
export type GoodsCategory = 'uniform' | 'towel' | 'cap' | 'stick' | 'keyring' | 'bat' | 'other'

export type ItemCondition = '새 상품' | '아주 좋음' | '좋음' | '사용감 있음'

/** 팬 마켓 판매글 (선수 관련 공식 굿즈 중고 판매) */
export type MarketListing = {
  id: string
  /** 판매자 id (신고·삭제 규칙은 커뮤니티 글과 같다) */
  authorId: string
  /** 판매자 표시 이름 (주문 확인에서 판매자별로 묶을 때 쓴다) */
  sellerName: string
  title: string
  category: GoodsCategory
  players: PlayerId[]
  /** 원 */
  price: number
  condition: ItemCondition
  /** 설명 원문 */
  text: string
  /** 사진 (최대 4장) */
  media: MediaRef[]
  createdAt: number
  reports: string[]
  /** 「주의」: 애매한 표현 경고를 받고도 그대로 올린 판매글 */
  caution: boolean
}

/** 저장소에 넘기는 새 판매글. 판매 규칙·작성 제한 검사는 넘기기 전에 끝낸다 (domain/market) */
export type NewListing = Pick<MarketListing, 'title' | 'category' | 'players' | 'price' | 'condition' | 'text' | 'caution'> & { files: NewMedia[] }

/** 장바구니 한 줄: 공식 스토어 상품(수량) 또는 팬 마켓 판매글(늘 1개) */
export type CartLine = { kind: 'store'; productId: string; qty: number } | { kind: 'listing'; listingId: string }

/** 마켓 전체 상태: 판매글(최신순)과 장바구니 */
export type MarketSnapshot = { listings: MarketListing[]; cart: CartLine[] }

// ---------- 계정 (시연용 로그인) ----------

/** 가입한 계정 (비밀번호 해시는 저장소 안에만 두고 밖으로 내보내지 않는다) */
export type Account = {
  /** `acct:…` (로그인 전 익명 사용자는 `local:…`) */
  id: string
  nickname: string
  /** 응원 팀 (가상 구단 이름). 고르지 않았으면 null */
  team: string | null
  createdAt: number
}

export type NewAccount = { nickname: string; password: string; team: string | null }

/** 「데모 계정으로 체험하기」 계정. 비밀번호 없이 그 버튼으로만 로그인한다 */
export const DEMO_ACCOUNT_ID = 'acct:demo'
export const DEMO_ACCOUNT_NICKNAME = '체험팬'

/** 로그인 기능 전에 이 브라우저에서 쓴 글의 작성자 id는 `local:`로 시작한다 (화면에는 「익명 팬」) */
export const isAnonymousAuthor = (authorId: string) => authorId.startsWith('local:')

// ---------- 나만의 라인업 ----------

/** 라인업 자리 12개: 야수 8 + 지명타자 + 선발(SP)·중간(MR)·마무리(CL) 투수 */
export type LineupSlotId = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH' | 'SP' | 'MR' | 'CL'
export type LineupHitterSlotId = Exclude<LineupSlotId, 'SP' | 'MR' | 'CL'>

/** 라인업 내용: 자리마다 선수(비어 있으면 null)와 타순(채운 타자 자리의 순서, 1번부터) */
export type LineupDraft = { slots: Record<LineupSlotId, PlayerId | null>; order: LineupHitterSlotId[] }

/** 계정마다 하나 저장하는 라인업 */
export type SavedLineup = LineupDraft & { accountId: string; updatedAt: number }

// ---------- 홈 프로필 ----------

/** 「마지막으로 본 때」를 기억하는 곳: 새 소식 창, 커뮤니티 화면 */
export type SeenKind = 'news' | 'community'

/** 마지막으로 본 때 (ms). 본 적 없으면 없음 */
export type SeenMarks = Partial<Record<SeenKind, number>>

/** 홈 프로필: 내 프로필 사진(로그인한 계정만)과 마지막으로 본 때 */
export type ProfileSnapshot = { image: Blob | null; seen: SeenMarks }

// ---------- 화면 설정 ----------

/** 화면 설정 (이 브라우저에만 저장) */
export type DisplaySettings = {
  /** 팀 컬러 테마 id (domain/theme/themes.ts) */
  themeId: string
  /** 야구 소품 배경 장식 */
  decorations: boolean
  /** 거친 표현 가리기: 허용된 욕도 ●●로 가려 보기 */
  maskProfanity: boolean
  /** 배경 진하기: 팀 테마 배경에 팀 색을 섞는 정도 (연하게·보통·진하게) */
  bgStrength: BackgroundStrength
}

export type BackgroundStrength = 'soft' | 'medium' | 'strong'
export const BACKGROUND_STRENGTHS: readonly BackgroundStrength[] = ['soft', 'medium', 'strong']

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = { themeId: 'default', decorations: false, maskProfanity: true, bgStrength: 'medium' }
