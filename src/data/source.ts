import type { LeagueId, PlayerId, RawBattedBall, RawDataset, RawWeek } from './types'

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
