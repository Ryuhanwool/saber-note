// 굿즈 마켓 상품 목록: 상품 종류와 기준 시세, 리그의 가상 구단별 공식 스토어 상품.
// 구단 색은 실제 구단을 따라 하지 않고, 구단이 나오는 순서대로 아래 색 조합을 하나씩 붙인다.
import type { GoodsCategory } from '../../data/types'

export type CategoryInfo = {
  label: string
  /** 공식 스토어 가격이자 팬 마켓 기준 시세 (원). 기타는 없음 */
  officialPrice: number | null
}

export const CATEGORIES: Record<GoodsCategory, CategoryInfo> = {
  uniform: { label: '유니폼', officialPrice: 89_000 },
  towel: { label: '응원 타월', officialPrice: 15_000 },
  cap: { label: '모자', officialPrice: 35_000 },
  stick: { label: '응원봉', officialPrice: 25_000 },
  keyring: { label: '키링', officialPrice: 9_000 },
  bat: { label: '미니 배트', officialPrice: 20_000 },
  other: { label: '기타', officialPrice: null },
}

/** 공식 스토어가 파는 종류 (순서대로 보인다) */
export const STORE_CATEGORIES: GoodsCategory[] = ['uniform', 'cap', 'towel', 'stick', 'bat', 'keyring']

export type TeamColors = { main: string; sub: string }

/** 가상 구단 색 조합 (구단이 나오는 순서대로. 6개를 넘으면 다시 처음부터) */
export const TEAM_PALETTE: TeamColors[] = [
  { main: '#1F6F5C', sub: '#F2C14E' },
  { main: '#5B3A8C', sub: '#E8E4F2' },
  { main: '#1D4E89', sub: '#9FD3F0' },
  { main: '#2B2B2B', sub: '#C6E05A' },
  { main: '#0B7A8F', sub: '#FF8A5B' },
  { main: '#7A2E2E', sub: '#E9D8A6' },
]

export type StoreProduct = {
  id: string
  team: string
  category: GoodsCategory
  name: string
  price: number
  colors: TeamColors
  /** 상품 그림에 들어갈 짧은 구단 표기 (예: "수달스") */
  mark: string
}

/** 상품 그림용 짧은 표기: 구단 이름의 마지막 낱말 */
export const teamMark = (team: string) => team.trim().split(/\s+/).pop() ?? team

/** 구단 목록(나오는 순서) → 구단마다 STORE_CATEGORIES 상품 */
export function storeCatalog(teams: readonly string[]): StoreProduct[] {
  return teams.flatMap((team, i) =>
    STORE_CATEGORIES.map((category) => ({
      id: `store:${team}:${category}`,
      team,
      category,
      name: `${team} ${category === 'uniform' ? '홈 유니폼' : CATEGORIES[category].label}`,
      price: CATEGORIES[category].officialPrice!,
      colors: TEAM_PALETTE[i % TEAM_PALETTE.length],
      mark: teamMark(team),
    })),
  )
}

/** 리그 선수 목록에서 구단 이름을 나오는 순서대로 (중복 없이) */
export const teamsOf = (players: readonly { team: string }[]) => [...new Set(players.map((p) => p.team))]

/** "89,000원" */
export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
