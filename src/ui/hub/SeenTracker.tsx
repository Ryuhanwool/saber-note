import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { useProfile } from './ProfileContext'

/** 커뮤니티 화면을 보면 「커뮤니티를 마지막으로 본 때」를 지금으로 (탭 바의 새 글 점이 꺼진다). 화면에는 아무것도 그리지 않는다 */
export default function SeenTracker() {
  const { pathname } = useLocation()
  const profile = useProfile()
  const repo = profile.status === 'ready' ? profile.repo : null
  const onCommunity = pathname.startsWith('/community')
  useEffect(() => {
    if (!repo || !onCommunity) return
    void repo.markSeen('community', Date.now()).catch(() => {})
  }, [repo, onCommunity])
  return null
}
