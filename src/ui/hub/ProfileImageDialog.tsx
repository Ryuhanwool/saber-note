import { useEffect, useId, useRef, useState } from 'react'
import { checkProfileImage, PROFILE_IMAGE_TYPES } from '../../domain/hub/profile'
import Emblem from './Emblem'
import { useProfile } from './ProfileContext'

/** 「프로필 이미지 바꾸기」 창: 내 사진을 올리거나 기본 엠블럼으로 되돌린다 (로그인한 계정만) */
export default function ProfileImageDialog({ team, onClose }: { team: string | null; onClose: () => void }) {
  const profile = useProfile()
  const [message, setMessage] = useState<{ text: string; warn: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const titleId = useId()
  const first = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const repo = profile.status === 'ready' ? profile.repo : null
  const ready = repo !== null
  const imageUrl = profile.status === 'ready' ? profile.imageUrl : null

  async function run(task: () => Promise<void>, done: string) {
    if (!ready) return
    setBusy(true)
    try {
      await task()
      setMessage({ text: done, warn: false })
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : '저장하지 못했어요.', warn: true })
    } finally {
      setBusy(false)
    }
  }

  function pick(file: File | undefined) {
    if (!file || !repo) return
    const problem = checkProfileImage(file)
    if (problem) {
      setMessage({ text: problem, warn: true })
      return
    }
    void run(() => repo.setImage(file), '프로필 사진을 바꿨어요.')
  }

  return (
    <div className="hub-dialog-backdrop" onClick={onClose}>
      <div className="hub-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <div className="hub-dialog-head">
          <h2 id={titleId}>프로필 이미지 바꾸기</h2>
          <button type="button" className="btn ghost" ref={first} onClick={onClose}>닫기</button>
        </div>
        <div className="profile-preview">
          <Emblem team={team} imageUrl={imageUrl} size={96} />
          <p className="muted">PNG·JPG·WEBP, 5MB까지. 동그랗게 잘라 보여 주고, 이 브라우저에만 저장돼요.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn" disabled={!ready || busy} onClick={() => fileRef.current?.click()}>사진 고르기</button>
          <button type="button" className="btn ghost" disabled={!ready || busy || !imageUrl} onClick={() => repo && void run(() => repo.setImage(null), '기본 엠블럼으로 되돌렸어요.')}>기본 엠블럼으로</button>
        </div>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept={PROFILE_IMAGE_TYPES.join(',')}
          aria-label="프로필 사진 파일"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <p className={`hub-note${message?.warn ? ' warn' : ''}`} role="status">{message?.text ?? ''}</p>
      </div>
    </div>
  )
}
