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
