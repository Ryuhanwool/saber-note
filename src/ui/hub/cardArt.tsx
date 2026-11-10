// 홈 카드 오른쪽 그림 (외부 이미지 없이 SVG). 바탕 원은 --chip, 선은 본문색, 강조는 팀 강조색(--seam).
// 장식이라 화면 읽기 프로그램에는 숨긴다 (카드 제목이 뜻을 알려 준다).

const Art = ({ children }: { children: React.ReactNode }) => (
  <svg className="card-art" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
    <circle cx="48" cy="48" r="46" fill="var(--chip)" />
    {children}
  </svg>
)

/** 선수 가치 순위: 올라가는 막대와 화살표 */
export const RankingArt = () => (
  <Art>
    <rect x="22" y="56" width="12" height="18" rx="2" fill="var(--ink)" opacity=".35" />
    <rect x="42" y="44" width="12" height="30" rx="2" fill="var(--ink)" opacity=".6" />
    <rect x="62" y="30" width="12" height="44" rx="2" fill="var(--seam)" />
    <path d="M20 46 L40 32 L52 38 L72 20" fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M62 19 L73 19 L73 30" fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </Art>
)

/** 미니게임: 과녁과 꽂힌 화살 */
export const GamesArt = () => (
  <Art>
    <circle cx="44" cy="52" r="26" fill="var(--surface)" stroke="var(--ink)" strokeWidth="3" />
    <circle cx="44" cy="52" r="16" fill="none" stroke="var(--seam)" strokeWidth="5" />
    <circle cx="44" cy="52" r="6" fill="var(--seam)" />
    <path d="M45 51 L74 22" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
    <path d="M70 18 L80 16 L78 26 Z M66 22 L76 32" fill="var(--ink)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
  </Art>
)

/** 커뮤니티: 겹친 말풍선 */
export const CommunityArt = () => (
  <Art>
    <path d="M18 26 h40 a6 6 0 0 1 6 6 v20 a6 6 0 0 1 -6 6 h-22 l-10 9 v-9 h-8 a6 6 0 0 1 -6 -6 v-20 a6 6 0 0 1 6 -6z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
    <path d="M26 38 h24 M26 46 h16" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
    <path d="M52 50 h24 a5 5 0 0 1 5 5 v14 a5 5 0 0 1 -5 5 h-4 v8 l-9 -8 h-11 a5 5 0 0 1 -5 -5 v-14 a5 5 0 0 1 5 -5z" fill="var(--seam)" />
    <circle cx="58" cy="62" r="2.6" fill="var(--surface)" />
    <circle cx="65" cy="62" r="2.6" fill="var(--surface)" />
    <circle cx="72" cy="62" r="2.6" fill="var(--surface)" />
  </Art>
)

/** 마켓: 쇼핑백과 별 */
export const MarketArt = () => (
  <Art>
    <path d="M24 36 h48 l-4 40 h-40 z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
    <path d="M36 42 v-10 a12 12 0 0 1 24 0 v10" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
    <path d="M48 48 l3.5 7 7.5 1 -5.5 5.2 1.4 7.6 -6.9 -3.7 -6.9 3.7 1.4 -7.6 -5.5 -5.2 7.5 -1 z" fill="var(--seam)" />
  </Art>
)
