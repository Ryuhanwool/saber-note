import { useAuth } from '../auth/AuthContext'
import { useCheer } from '../cheer/CheerContext'
import { useCommunity } from '../community/CommunityContext'
import { useMarket } from '../market/MarketContext'
import { useProfile } from './ProfileContext'

/** 홈·아이콘 줄·탭 바가 함께 쓰는 저장소 상태. 아직 열리지 않은 저장소는 빈 목록으로 본다 */
export function useHubData() {
  const auth = useAuth()
  const community = useCommunity()
  const cheer = useCheer()
  const market = useMarket()
  const profile = useProfile()
  const account = auth.status === 'ready' ? auth.account : null
  return {
    account,
    posts: community.status === 'ready' ? community.posts : [],
    postsReady: community.status === 'ready',
    cheers: cheer.status === 'ready' ? cheer.snapshot.cheers : [],
    cheerMessages: cheer.status === 'ready' ? cheer.snapshot.messages : [],
    cheerReady: cheer.status === 'ready',
    listings: market.status === 'ready' ? market.snapshot.listings : [],
    marketReady: market.status === 'ready',
    seen: profile.status === 'ready' ? profile.seen : null,
    profileRepo: profile.status === 'ready' ? profile.repo : null,
  }
}
