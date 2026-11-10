// 아이콘 (외부 이미지 없이 SVG로 그림). 색은 글자색(currentColor)을 따르고, 강조 부분만 --seam.
// 모두 장식용(aria-hidden)이라 버튼·링크에 이름을 따로 붙인다.

type P = { size?: number }

const Svg = ({ size = 24, children }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

export const BellIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
  </Svg>
)

export const SearchIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l5 5" />
  </Svg>
)

/** 화면 설정: 톱니 8개 달린 바퀴 */
export const GearIcon = (p: P) => (
  <Svg {...p}>
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <rect key={deg} x="10.5" y="2.6" width="3" height="4" rx="0.8" transform={`rotate(${deg} 12 12)`} fill="currentColor" stroke="none" />
    ))}
    <circle cx="12" cy="12" r="6.3" />
    <circle cx="12" cy="12" r="2.4" />
  </Svg>
)

export const LogoutIcon = (p: P) => (
  <Svg {...p}>
    <path d="M14 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H14" />
    <path d="M10.5 12H20M16.5 8.5L20 12l-3.5 3.5" />
  </Svg>
)

export const HomeIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 11L12 4l8.5 7" />
    <path d="M6 9.5V20h4.5v-5.5h3V20H18V9.5" />
  </Svg>
)

export const BagIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 8h14l-1.2 12H6.2z" />
    <path d="M9 10V7a3 3 0 0 1 6 0v3" />
  </Svg>
)

export const ChatIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 5.5h16v10H11l-4.5 4v-4H4z" />
    <path d="M8 9.5h8M8 12.5h5" />
  </Svg>
)

/** 라인업: 내야 다이아몬드 + 베이스 */
export const DiamondIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5L20.5 12 12 20.5 3.5 12z" />
    <rect x="10.6" y="2.1" width="2.8" height="2.8" transform="rotate(45 12 3.5)" fill="currentColor" stroke="none" />
    <rect x="19.1" y="10.6" width="2.8" height="2.8" transform="rotate(45 20.5 12)" fill="currentColor" stroke="none" />
    <rect x="2.1" y="10.6" width="2.8" height="2.8" transform="rotate(45 3.5 12)" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </Svg>
)

/** 순위: 시상대 */
export const PodiumIcon = (p: P) => (
  <Svg {...p}>
    <path d="M9 20V8.5h6V20M3.5 20v-7H9M15 20v-5h5.5v5M2.5 20h19" />
    <path d="M12 3.2l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="currentColor" stroke="none" />
  </Svg>
)
