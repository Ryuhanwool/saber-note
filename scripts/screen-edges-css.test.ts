// 화면 위아래 다듬기 (CSS): 앱 머리줄만 위에 붙음, 탭 바 경계·불투명, 아래 여백, 「맨 위로」 위치, 창이 탭 바 위에서 끝남
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(resolve(import.meta.dirname, p), 'utf8')
const base = read('../src/ui/shared/base.css')
const hub = read('../src/ui/hub/hub.css')
const settings = read('../src/ui/settings/settings.css')
const all = [base, hub, settings, read('../src/ui/community/community.css'), read('../src/ui/lineup/lineup.css')].join('\n')

describe('화면 위아래', () => {
  it('위에 붙는 머리줄 규칙은 앱 머리줄(.app-header)에만 — 글 카드 안 <header>에 번지지 않는다', () => {
    expect(all.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/(^|[\s,}])header\s*[{,\s]/m)
    expect(base).toMatch(/\.app-header\{position:sticky[^}]*z-index:5/)
  })
  it('위에 붙는 탭·필터(z-index 3)는 머리줄(5) 아래, 탭 바(6)와 창(7~8)은 그 위', () => {
    expect(base).toMatch(/\.player-tabs\{[^}]*z-index:3/)
    expect(hub).toMatch(/\.tabbar\{[^}]*z-index:6/)
  })
  it('탭 바: 불투명 바탕, 위 경계선과 은은한 그림자', () => {
    expect(hub).toMatch(/\.tabbar\{[^}]*background-color:var\(--bar-bg\);background-image:none;opacity:1;border-top:1px solid var\(--line\);box-shadow:0 -1px 0 var\(--line\),0 -6px 18px/)
  })
  it('휴대폰 폭 맨 아래 여백 = 탭 바 + 튀어나온 홈 버튼 + 안전 영역 + 「맨 위로」 자리 + 여유', () => {
    expect(hub).toContain('--tab-raise:22px')
    expect(hub).toContain('--tabbar-reach:calc(var(--tabbar-h) + var(--tabbar-edge) + var(--tab-raise))')
    expect(base).toContain('main{padding-bottom:calc(var(--tabbar-reach,91px) + env(safe-area-inset-bottom,0px) + 72px)}')
  })
  it('「맨 위로」는 탭 바·홈 버튼 위 12px, 여백(72px) 안에 들어간다 (12 + 44 + 12 ≤ 72)', () => {
    expect(base).toMatch(/\.to-top\{bottom:calc\(var\(--tabbar-reach,91px\) \+ env\(safe-area-inset-bottom,0px\) \+ 12px\);width:44px;height:44px\}/)
  })
  it('휴대폰 폭 화면 설정 창·아이콘 창은 탭 바·홈 버튼 위에서 끝나고, 탭 바보다 위 층', () => {
    expect(settings).toMatch(/\.settings-panel\{[^}]*z-index:8;max-height:calc\(100vh - var\(--sticky-top\) - var\(--tabbar-reach,91px\)/)
    expect(hub).toMatch(/\.hub-pop\{z-index:8;max-height:calc\(100vh - var\(--sticky-top\) - var\(--tabbar-reach\)/)
  })
})
