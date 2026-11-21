import { useCallback, useEffect, useRef, useState } from 'react'
import type { MediaRef } from '../../data/types'
import { useCommunity } from './CommunityContext'

/** 파일 하나: 저장소에서 주소를 얻어 사진·움짤은 img, 영상은 video로 보여 준다 */
function MediaItem({ media, onZoom }: { media: MediaRef; onZoom: (url: string) => void }) {
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
  // 글 안에서는 높이를 줄여 보여 주고(휴대폰 폭), 누르면 크게 본다
  return media.kind === '영상' ? (
    <div className="mitem">
      <video src={url} controls playsInline preload="metadata" onError={() => setBroken(true)} />
      <button type="button" className="mzoom" aria-label={`${media.kind} 크게 보기`} onClick={() => onZoom(url)}>크게 보기</button>
    </div>
  ) : (
    <button type="button" className="mitem mbtn" aria-label={`${media.kind} 크게 보기`} onClick={() => onZoom(url)}>
      <img src={url} alt={media.kind} loading="lazy" onError={() => setBroken(true)} />
    </button>
  )
}

/** 크게 보기: 화면 가득 (Esc·바깥·「닫기」로 닫고, 누른 버튼으로 초점을 돌린다) */
function Lightbox({ media, url, onClose }: { media: MediaRef; url: string; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    close.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${media.kind} 크게 보기`} onClick={onClose}>
      <button type="button" ref={close} className="btn lightbox-close" onClick={onClose}>닫기</button>
      <div className="lightbox-body" onClick={(e) => e.stopPropagation()}>
        {media.kind === '영상' ? <video src={url} controls playsInline autoPlay /> : <img src={url} alt={media.kind} />}
      </div>
    </div>
  )
}

export default function PostMedia({ media }: { media: MediaRef[] }) {
  const [zoom, setZoom] = useState<{ media: MediaRef; url: string; from: HTMLElement | null } | null>(null)
  const closeZoom = useCallback(() => {
    setZoom((z) => {
      z?.from?.focus()
      return null
    })
  }, [])
  if (!media.length) return null
  return (
    <>
      <div className={`mgrid n${Math.min(media.length, 4)}`}>
        {media.map((m) => <MediaItem key={m.id} media={m} onZoom={(url) => setZoom({ media: m, url, from: document.activeElement as HTMLElement | null })} />)}
      </div>
      {zoom && <Lightbox media={zoom.media} url={zoom.url} onClose={closeZoom} />}
    </>
  )
}
