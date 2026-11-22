import { useEffect, useId, useRef, useState } from 'react'
import { BACKGROUND_TYPES } from '../../domain/theme/background'
import { THEMES } from '../../domain/theme/themes'
import { GearIcon } from '../hub/icons'
import DemoReset from '../community/DemoReset'
import { useSettings } from './SettingsContext'
import './settings.css'
import { BACKGROUND_STRENGTHS } from '../../data/types'
import { BACKGROUND_STRENGTH_LABELS } from '../../domain/theme/surface'

/** 상단 메뉴 옆 「화면 설정」 버튼과 설정 창 */
export default function SettingsButton() {
  const ctx = useSettings()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<{ text: string; warn: boolean } | null>(null)
  const panelId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)

  // Esc나 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: PointerEvent) => wrapRef.current && !wrapRef.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  if (!ctx) return null
  const { settings, backgroundUrl, persistent, update, setBackground, resetBackground } = ctx

  async function pickImage(file: File | undefined) {
    if (!file) return
    const problem = await setBackground(file)
    setMessage(problem ? { text: problem, warn: true } : { text: '내 사진을 배경으로 바꿨어요.', warn: false })
  }

  return (
    <div className="settings" ref={wrapRef}>
      <button
        className="icon-btn settings-btn"
        aria-label="화면 설정"
        title="화면 설정"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <GearIcon />
      </button>
      {open && (
        <div className="settings-panel panel" id={panelId} role="dialog" aria-label="화면 설정">
          <h2>화면 설정</h2>

          <fieldset>
            <legend>팀 컬러 테마</legend>
            <div className="swatches">
              {THEMES.map((t) => (
                <label key={t.id} className="swatch">
                  <input type="radio" name="team-theme" value={t.id} checked={settings.themeId === t.id} onChange={() => update({ themeId: t.id })} />
                  <span
                    className="swatch-color"
                    style={t.colors ? { background: `linear-gradient(135deg, ${t.colors[0]} 50%, ${t.colors[1]} 50%)` } : undefined}
                    aria-hidden="true"
                  />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>배경 진하기</legend>
            <div className="seg" role="radiogroup" aria-label="배경 진하기">
              {BACKGROUND_STRENGTHS.map((s) => (
                <label key={s} className="seg-item">
                  <input type="radio" name="bg-strength" value={s} checked={settings.bgStrength === s} onChange={() => update({ bgStrength: s })} />
                  {BACKGROUND_STRENGTH_LABELS[s]}
                </label>
              ))}
            </div>
            <p className="muted hint">팀 컬러 테마 배경에 팀 색을 섞는 정도예요. 글자가 잘 읽히도록, 테마에 따라 「진하게」가 조금 덜 진할 수 있어요.</p>
          </fieldset>

          <fieldset>
            <legend>내 이미지 배경</legend>
            <div className="bg-row">
              {backgroundUrl && <img className="bg-thumb" src={backgroundUrl} alt="지금 배경 사진" />}
              <label className="btn ghost">
                <input type="file" accept={BACKGROUND_TYPES.join(',')} hidden onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = '' }} />
                사진 고르기
              </label>
              <button className="btn ghost" onClick={() => { void resetBackground(); setMessage({ text: '기본 배경으로 되돌렸어요.', warn: false }) }}>
                기본 배경으로
              </button>
            </div>
            <p className="muted hint">PNG·JPG·WEBP, 10MB 이하. 「기본 배경으로」는 내 사진을 지우고 기본 테마로 돌아가요.</p>
          </fieldset>

          <fieldset>
            <legend>배경 장식</legend>
            <label className="toggle">
              <input type="checkbox" checked={settings.decorations} onChange={(e) => update({ decorations: e.target.checked })} />
              야구공·배트·글러브·베이스·별 무늬를 아주 흐리게 깔기
            </label>
          </fieldset>

          <fieldset>
            <legend>커뮤니티</legend>
            <label className="toggle">
              <input type="checkbox" checked={settings.maskProfanity} onChange={(e) => update({ maskProfanity: e.target.checked })} />
              거친 표현 가리기 (허용된 욕도 ●●로 보기)
            </label>
          </fieldset>

          {!persistent && <p className="muted hint">이 브라우저에서는 설정을 저장할 수 없어 새로고침하면 처음으로 돌아가요.</p>}
          {message && (
            <p className="hint" role="status" style={{ color: message.warn ? 'var(--seam)' : undefined }}>{message.text}</p>
          )}
          <DemoReset />
        </div>
      )}
    </div>
  )
}
