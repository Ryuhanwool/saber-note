import { useEffect, useRef, useState } from 'react'
import type { PlayerId } from '../../data/types'
import { StorageFullError } from '../../data/source'
import { moderate } from '../../domain/community/moderation'
import { ACCEPTED_TYPES, blockMessage, checkFiles, MAX_FILES, MAX_TEXT_LENGTH, MEDIA_KINDS, preparePost } from '../../domain/community/posts'
import type { MediaKind } from '../../data/types'
import { useLeague } from '../shared/LeagueContext'
import SearchBox from '../shared/SearchBox'
import { useCommunity } from './CommunityContext'

type DraftFile = { file: File; kind: MediaKind; preview: string }

const STORAGE_NOTE = {
  browser: '지금은 글과 사진·영상이 이 브라우저에만 저장돼요. 새로고침해도 남지만 다른 사람에게는 보이지 않아요.',
  memory: '이 브라우저에서는 저장소를 쓸 수 없어 새로고침하면 글이 사라져요.',
  shared: '여기 올린 글과 사진·영상은 모두에게 보여요.',
} as const

const previewOf = (file: File) => (typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '')
const revoke = (f: DraftFile) => f.preview && URL.revokeObjectURL(f.preview)

/** 글쓰기: 본문 · 작성 제한 안내 · 선수 태그 · 파일(최대 4개, 20MB) · 게시 */
export default function Composer({ initialTags = [], autoFocus = false }: { initialTags?: PlayerId[]; autoFocus?: boolean }) {
  const league = useLeague()
  const state = useCommunity()
  const [text, setText] = useState('')
  const [tags, setTags] = useState<PlayerId[]>(initialTags)
  const [files, setFiles] = useState<DraftFile[]>([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ text: string; warn: boolean } | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const filesRef = useRef(files)
  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    if (autoFocus) textRef.current?.focus()
  }, [autoFocus])
  // 화면을 떠나면 미리보기 주소를 정리한다
  useEffect(() => () => filesRef.current.forEach(revoke), [])

  if (state.status !== 'ready') return null
  const { repo, user, posts } = state
  const mod = moderate(text)
  const players = [...league.hitters, ...league.pitchers]
  const canPost = !busy && user !== null && mod.level !== 'block' && (text.trim() !== '' || files.length > 0)

  function addFiles(list: File[]) {
    const { accepted, errors } = checkFiles(files.length, list)
    setFiles([...files, ...accepted.map((i) => ({ file: list[i], kind: MEDIA_KINDS[list[i].type], preview: previewOf(list[i]) }))])
    setNote(errors.length ? { text: errors.join(' / '), warn: true } : null)
  }

  function removeFile(i: number) {
    revoke(files[i])
    setFiles(files.filter((_, j) => j !== i))
  }

  async function submit() {
    if (!user) return
    // 도배 제한: 이 사용자가 마지막으로 올린 글 시각 (새로고침해도 저장소에서 알 수 있다)
    const mine = posts.filter((p) => p.authorId === user.id)
    const lastPostAt = mine.length ? Math.max(...mine.map((p) => p.createdAt)) : null
    const prepared = preparePost({ text, players: tags, fileCount: files.length }, { players, lastPostAt, now: Date.now() })
    if (!prepared.ok) {
      setNote({ text: prepared.message, warn: true })
      return
    }
    setBusy(true)
    setNote({ text: '올리는 중이에요…', warn: false })
    try {
      await repo.create({
        text: prepared.text,
        players: prepared.players,
        masked: prepared.masked,
        files: files.map((f) => ({ blob: f.file, kind: f.kind, name: f.file.name })),
      })
      files.forEach(revoke)
      setText('')
      setTags([])
      setFiles([])
      setNote({ text: prepared.masked ? '게시했어요. 거친 표현 일부는 가려졌어요.' : '게시했어요.', warn: false })
    } catch (e) {
      setNote({
        text: e instanceof StorageFullError
          ? '저장 공간이 가득 차서 올리지 못했어요. 오래된 글이나 큰 파일을 지운 뒤 다시 올려 주세요.'
          : '올리지 못했어요. 잠시 뒤 다시 시도해 주세요.',
        warn: true,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel composer">
      <h1 className="display" style={{ fontSize: '1.8rem', margin: '0 0 10px' }}>커뮤니티</h1>
      <textarea
        ref={textRef}
        rows={4}
        maxLength={MAX_TEXT_LENGTH}
        placeholder="선수 이야기, 경기 장면, 지표 분석을 자유롭게 나눠 보세요"
        aria-label="글 내용"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className={`modmsg ${mod.level === 'ok' ? '' : mod.level}`} aria-live="polite">
        {mod.level === 'block' && <><b>이대로는 올릴 수 없어요.</b> {blockMessage(mod).replace('이대로는 올릴 수 없어요. ', '')}</>}
        {mod.level === 'mild' && `거친 표현(${mod.found.join(', ')})은 게시할 때 ●●로 가려져요.`}
      </div>
      <div className="tagrow">
        <span className="muted" style={{ fontSize: '.85rem' }}>선수 태그</span>
        <span>
          {tags.map((id) => {
            const p = league.byId.get(id)
            return p && (
              <button key={id} className="chip small" aria-label={`${p.name} 태그 빼기`} onClick={() => setTags(tags.filter((x) => x !== id))}>
                {p.name} ✕
              </button>
            )
          })}
        </span>
        <span style={{ flex: 1, minWidth: 160 }}>
          <SearchBox
            label="선수 태그 검색"
            placeholder="선수 이름으로 태그 추가"
            exclude={tags}
            limit={6}
            clearOnPick
            emptyText={() => '맞는 선수가 없어요.'}
            onPick={(p) => setTags([...tags, p.id])}
          />
        </span>
      </div>
      {files.length > 0 && (
        <div className="previews">
          {files.map((f, i) => (
            <div key={f.preview || `${f.file.name}-${i}`} className="pv">
              {f.preview && (f.kind === '영상' ? <video src={f.preview} muted playsInline /> : <img src={f.preview} alt="" />)}
              <span className="kind">{f.kind}</span>
              <button aria-label={`${f.file.name} 빼기`} onClick={() => removeFile(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="crow">
        <label className="btn ghost">
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            hidden
            disabled={files.length >= MAX_FILES}
            onChange={(e) => {
              addFiles([...(e.target.files ?? [])])
              e.target.value = ''
            }}
          />
          사진 · 움짤 · 영상 추가
        </label>
        <span className="muted" style={{ fontSize: '.8rem' }}>최대 {MAX_FILES}개, 파일당 20MB</span>
        <button className="btn" style={{ marginLeft: 'auto' }} disabled={!canPost} onClick={submit}>게시하기</button>
      </div>
      <p className="muted" role="status" style={{ fontSize: '.8rem', margin: '10px 0 0', color: note?.warn ? 'var(--seam)' : undefined }}>
        {note?.text ?? STORAGE_NOTE[repo.storage]}
      </p>
    </div>
  )
}
