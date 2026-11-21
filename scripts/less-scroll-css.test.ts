// 휴대폰 스크롤 줄이기: 붙어 있는 탭·필터, 아래에서 올라오는 창, 휴대폰 여백 (CSS)
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(resolve(import.meta.dirname, p), 'utf8')
const base = read('../src/ui/shared/base.css')
const lineup = read('../src/ui/lineup/lineup.css')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '')

describe('스크롤해도 위에 붙어 있는 탭·필터', () => {
  it('선수 카드 탭과 순위표 필터는 머리줄 높이 + 안전 영역 아래에 붙는다 (머리줄과 겹치지 않게)', () => {
    expect(base).toContain('--sticky-top:calc(var(--header-h,62px) + env(safe-area-inset-top,0px))')
    expect(base).toMatch(/\.player-tabs\{position:sticky;top:var\(--sticky-top\);z-index:3;background:var\(--surface\)/)
    expect(base).toMatch(/\.ranking \.rk-filters\{position:sticky;top:var\(--sticky-top\);z-index:3;background:var\(--surface\)/)
    // 머리줄(z-index 5)보다 아래 층
    expect(base).toMatch(/header\{position:sticky;top:env\(safe-area-inset-top,0px\);z-index:5/)
  })
})

describe('아래에서 올라오는 창', () => {
  it('글쓰기 창은 화면 아래에 붙고 하단 안전 영역을 피한다, 동작 줄이기면 움직이지 않는다', () => {
    expect(base).toMatch(/\.sheet\{position:fixed;left:0;right:0;bottom:0/)
    expect(base).toMatch(/\.sheet\{[^}]*env\(safe-area-inset-bottom,0px\)/)
    expect(base).toContain('@media (prefers-reduced-motion:reduce){.sheet{animation:none}}')
  })
  it('라인업 선수 고르기 창은 휴대폰 폭(720px 이하)에서 아래에서 올라온다', () => {
    const phone = lineup.slice(lineup.lastIndexOf('@media (max-width:720px){'))
    expect(phone).toMatch(/\.picker-backdrop\{place-items:end stretch;padding:0\}/)
    expect(phone).toMatch(/\.picker\{width:100%;max-height:85vh;border-radius:16px 16px 0 0/)
  })
})

describe('휴대폰 폭 여백', () => {
  it('바깥 여백 20px → 12px, 패널 안 여백 20px → 14px, 「맨 위로」는 탭 바 위에', () => {
    expect(base).toContain(':root{--gutter:20px;--panel-pad:20px;')
    expect(base).toMatch(/@media \(max-width:720px\)\{\n  :root\{--gutter:12px;--panel-pad:14px\}/)
    expect(base).toContain('main{max-width:1040px;margin:0 auto;padding:8px var(--gutter) 64px}')
    expect(base).toMatch(/\.to-top\{bottom:calc\(var\(--tabbar-h,64px\) \+ 16px \+ env\(safe-area-inset-bottom,0px\)\)\}/)
    expect(strip(base)).not.toMatch(/\.(sheet|to-top|fold|more)[^{]*\{[^}]*#[0-9A-Fa-f]{3,6}\b/)
  })
})
