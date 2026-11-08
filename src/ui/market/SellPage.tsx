import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { StorageFullError } from '../../data/source'
import type { GoodsCategory, ItemCondition, PlayerId } from '../../data/types'
import { CATEGORIES } from '../../domain/market/catalog'
import { checkPhotos, CONDITIONS, lastListingAt, MAX_LISTING_TEXT, MAX_PHOTOS, MAX_TITLE_LENGTH, PHOTO_TYPES, prepareListing } from '../../domain/market/listing'
import { loginPath } from '../auth/login'
import { useLeague } from '../shared/LeagueContext'
import SearchBox from '../shared/SearchBox'
import { SaleRules } from './FanMarketPage'
import { listingPath } from './hooks'
import { useMarket } from './MarketContext'
import { MarketNav, MarketStatus } from './shared'
import './market.css'

type DraftPhoto = { file: File; preview: string }
const previewOf = (file: File) => (typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '')
const revoke = (f: DraftPhoto) => f.preview && URL.revokeObjectURL(f.preview)
const currentTime = () => Date.now()
const parsePrice = (s: string) => (s.trim() === '' ? Number.NaN : Number(s.replace(/[,\s원]/g, '')))

/** 화면 12. 판매글 쓰기 (?player=…로 선수 태그를 미리 단다) */
export default function SellPage() {
  const league = useLeague()
  const state = useMarket()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { pathname, search } = useLocation()
  const initial = params.get('player') as PlayerId | null
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<GoodsCategory>('uniform')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<ItemCondition>('아주 좋음')
  const [text, setText] = useState('')
  const [tags, setTags] = useState<PlayerId[]>(initial && league.byId.has(initial) ? [initial] : [])
  const [photos, setPhotos] = useState<DraftPhoto[]>([])
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ text: string; warn: boolean } | null>(null)
  const [warnings, setWarnings] = useState<string[] | null>(null)
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(() => () => photosRef.current.forEach(revoke), [])

  if (state.status !== 'ready') return <MarketStatus />
  const { repo, user, snapshot } = state
  // 판매글 쓰기는 로그인이 필요하다 (주소로 바로 들어와도 로그인 화면으로)
  if (!user) return <Navigate to={loginPath(pathname + search)} replace />
  const players = [...league.hitters, ...league.pitchers]
  const edited = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setWarnings(null)
  }

  function addPhotos(list: File[]) {
    const { accepted, errors } = checkPhotos(photos.length, list)
    setPhotos([...photos, ...accepted.map((i) => ({ file: list[i], preview: previewOf(list[i]) }))])
    setNote(errors.length ? { text: errors.join(' / '), warn: true } : null)
  }

  async function submit(confirmWarnings = false) {
    if (!user) return
    const r = prepareListing(
      { title, text, category, price: parsePrice(price), condition, players: tags, photoCount: photos.length, agreed, confirmWarnings },
      { players, lastPostAt: lastListingAt(snapshot.listings, user.id), now: currentTime() },
    )
    if (!r.ok) {
      if (r.reason === 'needs-confirm') setWarnings(r.warnings ?? [])
      else setNote({ text: r.message, warn: true })
      return
    }
    setWarnings(null)
    setBusy(true)
    try {
      const l = await repo.createListing({
        title: r.title, text: r.text, category, players: r.players, price: r.price, condition, caution: r.caution,
        files: photos.map((p) => ({ blob: p.file, kind: '사진', name: p.file.name })),
      })
      photos.forEach(revoke)
      setPhotos([])
      navigate(listingPath(l.id))
    } catch (e) {
      setNote({ text: e instanceof StorageFullError ? '저장 공간이 가득 차서 올리지 못했어요. 사진을 줄여 다시 올려 주세요.' : '올리지 못했어요. 잠시 뒤 다시 시도해 주세요.', warn: true })
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="display" style={{ fontSize: '1.8rem', margin: '0 0 8px' }}>굿즈 마켓</h1>
      <MarketNav />
      <div className="comm" style={{ marginTop: 12 }}>
        <div className="panel composer sell">
          <h2 style={{ marginTop: 0 }}>판매글 쓰기</h2>
          <p className="muted" style={{ fontSize: '.85rem', margin: '0 0 10px' }}>시연용이라 판매글이 이 브라우저에만 저장돼요. 실제 거래는 일어나지 않아요.</p>
          <label>상품 이름<input value={title} maxLength={MAX_TITLE_LENGTH} onChange={(e) => edited(setTitle)(e.target.value)} placeholder="예: 홈 유니폼 (이름 마킹)" /></label>
          <div className="row" style={{ gap: 12 }}>
            <label>종류
              <select value={category} onChange={(e) => edited(setCategory)(e.target.value as GoodsCategory)}>
                {(Object.keys(CATEGORIES) as GoodsCategory[]).map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
              </select>
            </label>
            <label>상태
              <select value={condition} onChange={(e) => edited(setCondition)(e.target.value as ItemCondition)}>
                {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>가격(원)<input inputMode="numeric" value={price} onChange={(e) => edited(setPrice)(e.target.value)} placeholder="예: 50000" /></label>
          </div>
          <div className="tagrow">
            <span className="muted" style={{ fontSize: '.85rem' }}>선수 태그</span>
            <span>
              {tags.map((pid) => {
                const p = league.byId.get(pid)
                return p && <button type="button" key={pid} className="chip small" aria-label={`${p.name} 태그 빼기`} onClick={() => edited(setTags)(tags.filter((x) => x !== pid))}>{p.name} ✕</button>
              })}
            </span>
            <span style={{ flex: 1, minWidth: 160 }}>
              <SearchBox label="선수 태그 검색" placeholder="선수 이름으로 태그 추가" exclude={tags} limit={6} clearOnPick emptyText={() => '맞는 선수가 없어요.'} onPick={(p) => edited(setTags)([...tags, p.id])} />
            </span>
          </div>
          <label>설명<textarea rows={4} maxLength={MAX_LISTING_TEXT} value={text} onChange={(e) => edited(setText)(e.target.value)} placeholder="어디서 산 공식 상품인지, 사용 기간, 하자 등을 적어 주세요" /></label>
          {photos.length > 0 && (
            <div className="previews">
              {photos.map((p, i) => (
                <div key={p.preview || `${p.file.name}-${i}`} className="pv">
                  {p.preview && <img src={p.preview} alt="" />}
                  <button type="button" aria-label={`${p.file.name} 빼기`} onClick={() => { revoke(p); setPhotos(photos.filter((_, j) => j !== i)) }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="crow">
            <label className="btn ghost">
              <input type="file" accept={PHOTO_TYPES.join(',')} multiple hidden disabled={photos.length >= MAX_PHOTOS}
                onChange={(e) => { addPhotos([...(e.target.files ?? [])]); e.target.value = '' }} />
              사진 추가
            </label>
            <span className="muted" style={{ fontSize: '.8rem' }}>PNG·JPG·WEBP, 최대 {MAX_PHOTOS}장, 장당 10MB</span>
          </div>
          <label className="agree">
            <input type="checkbox" checked={agreed} onChange={(e) => edited(setAgreed)(e.target.checked)} />
            판매 규칙을 읽었고, 공식 굿즈만 팔게요 (직접 만든 비공식 상품·티켓 되팔기 아님)
          </label>
          {warnings && (
            <div className="modmsg block" role="alertdialog" aria-label="게시 전 확인">
              <p style={{ margin: '0 0 4px' }}><b>이대로 올릴까요?</b> 그래도 올리면 사는 사람에게 「주의」로 보여요.</p>
              <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              <div className="row" style={{ gap: 8 }}>
                <button type="button" className="btn ghost" onClick={() => setWarnings(null)}>고쳐 쓰기</button>
                <button type="button" className="btn" disabled={busy} onClick={() => void submit(true)}>그래도 올리기</button>
              </div>
            </div>
          )}
          <div className="crow">
            <button type="button" className="btn" style={{ marginLeft: 'auto' }} disabled={busy || user === null || warnings !== null} onClick={() => void submit()}>판매글 올리기</button>
          </div>
          <p className="muted" role="status" style={{ fontSize: '.85rem', margin: '10px 0 0', color: note?.warn ? 'var(--seam)' : undefined }}>{note?.text}</p>
        </div>
        <aside>
          <SaleRules />
        </aside>
      </div>
    </div>
  )
}
