import { useEffect, useState } from 'react'
import type { MediaRef } from '../../data/types'
import { useCommunity } from './CommunityContext'

/** 파일 하나: 저장소에서 주소를 얻어 사진·움짤은 img, 영상은 video로 보여 준다 */
function MediaItem({ media }: { media: MediaRef }) {
  const state = useCommunity()
  const [url, setUrl] = useState<string | null | undefined>(undefined) // undefined: 불러오는 중
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    if (state.status !== 'ready') return
    let alive = true
    state.repo.mediaUrl(media).then(
      (u) => alive && setUrl(u),
      () => alive && setUrl(null),
    )
    return () => {
      alive = false
    }
  }, [state, media])

  if (url === undefined) return <div className="mph">불러오는 중…</div>
  if (url === null || broken) return <div className="mph">이 파일을 볼 수 없어요</div>
  return media.kind === '영상' ? (
    <video src={url} controls playsInline preload="metadata" onError={() => setBroken(true)} />
  ) : (
    <img src={url} alt={media.kind} loading="lazy" onError={() => setBroken(true)} />
  )
}

export default function PostMedia({ media }: { media: MediaRef[] }) {
  if (!media.length) return null
  return (
    <div className={`mgrid n${Math.min(media.length, 4)}`}>
      {media.map((m) => <MediaItem key={m.id} media={m} />)}
    </div>
  )
}
