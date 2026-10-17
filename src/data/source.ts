import type { LeagueId, PlayerId, RawBattedBall, RawDataset } from './types'

/** 리그별 데이터 출처가 구현하는 인터페이스. ui는 registry를 거쳐서만 얻는다. */
export interface LeagueDataSource {
  readonly league: LeagueId
  /** 시즌 기록 전체. season을 생략하면 출처의 최신 시즌 */
  load(season?: number): Promise<RawDataset>
  /** 타자 한 명의 타구 목록. 트래킹 데이터가 없으면 빈 배열 */
  loadBattedBalls(id: PlayerId): Promise<RawBattedBall[]>
}
