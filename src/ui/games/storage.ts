// 브라우저 저장소(기기별 개인 기록용). 사생활 보호 모드 등에서 막혀 있어도 게임은 돌아가게 한다.
export const localStore = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value)
    } catch {
      // 저장하지 못해도 게임은 계속한다
    }
  },
}

/** 오늘의 블라인드 퀴즈를 끝낸 한국 날짜 (YYYY-MM-DD). 홈 「오늘의 소식」의 「오늘 퀴즈 완료」 */
export const BLIND_DONE_KEY = 'saber-note-blind-done'
/** 세이버 픽 챌린지를 제출한 주차 ("2026-W47"). 홈 「오늘의 소식」의 「제출 완료」 */
export const CHALLENGE_SUBMITTED_KEY = 'saber-note-challenge-submitted'
