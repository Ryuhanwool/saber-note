import type { CommunityPost, CommunityUser, DisplaySettings, LeagueId, MediaRef, NewPost, PlayerId, RawBattedBall, RawDataset, RawWeek } from './types'

/** 리그별 데이터 출처가 구현하는 인터페이스. ui는 registry를 거쳐서만 얻는다. */
export interface LeagueDataSource {
  readonly league: LeagueId
  /** 시즌 기록 전체. season을 생략하면 출처의 최신 시즌 */
  load(season?: number): Promise<RawDataset>
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

/** 저장 공간이 모자라 저장하지 못했을 때 */
export class StorageFullError extends Error {
  constructor() {
    super('저장 공간이 가득 찼습니다.')
    this.name = 'StorageFullError'
  }
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
