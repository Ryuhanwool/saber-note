import { Link, useLocation } from 'react-router'
import { cheeredAnyToday, hasNewSince } from '../../domain/hub/news'
import { useNow } from '../shared/useNow'
import { BagIcon, ChatIcon, DiamondIcon, HomeIcon, PodiumIcon } from './icons'
import { useHubData } from './useHubData'

type Tab = { to: string; label: string; icon: React.ReactNode; match: (p: string) => boolean; home?: boolean }

// 가운데가 홈. 비교·미니게임·선수 카드는 홈에서 들어가므로 홈 탭을 현재 위치로 표시한다
const TABS: Tab[] = [
  { to: '/market', label: '마켓', icon: <BagIcon />, match: (p) => p.startsWith('/market') },
  { to: '/community', label: '커뮤니티', icon: <ChatIcon />, match: (p) => p.startsWith('/community') },
  { to: '/', label: '홈', icon: <HomeIcon size={28} />, home: true, match: (p) => p === '/' || ['/player/', '/compare', '/games'].some((x) => p.startsWith(x)) },
  { to: '/lineup', label: '라인업', icon: <DiamondIcon />, match: (p) => p.startsWith('/lineup') },
  { to: '/ranking', label: '순위', icon: <PodiumIcon />, match: (p) => p.startsWith('/ranking') },
]

/** 휴대폰 폭의 아래쪽 탭 바: 마켓 · 커뮤니티 · 홈(가운데, 강조) · 라인업 · 순위. 새 글·오늘 아직 응원 안 함은 작은 점 */
export default function TabBar() {
  const { pathname } = useLocation()
  const d = useHubData()
  const now = useNow()
  const userId = d.account?.id ?? null
  // 프로필 저장소가 열려 「마지막으로 본 때」를 알 때만 점을 단다
  const newPosts = d.seen !== null && d.postsReady && !pathname.startsWith('/community') && hasNewSince(d.posts, userId, d.seen.community ?? null, now)
  const notCheered = userId !== null && d.cheerReady && !cheeredAnyToday(d.cheers, userId, now)
  const dot: Record<string, string | null> = { '/community': newPosts ? '새 글 있음' : null, '/': notCheered ? '오늘 아직 응원하지 않았어요' : null }
  return (
    <nav className="tabbar" aria-label="아래 탭">
      {TABS.map((t) => {
        const note = dot[t.to] ?? null
        return (
          <Link key={t.to} to={t.to} className={`tab${t.home ? ' tab-home' : ''}`} aria-current={t.match(pathname) ? 'page' : undefined}>
            <span className="tab-icon">
              {t.icon}
              {note && <span className="dot tab-dot" aria-hidden="true" />}
            </span>
            <span className="tab-label">{t.label}</span>
            {note && <span className="sr-only">{` (${note})`}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
