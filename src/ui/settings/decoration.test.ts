// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { DECORATION_ITEMS, decorationSvg, decorationUrl, TILE_SIZE } from './decoration'

describe('배경 장식 SVG', () => {
  const svg = decorationSvg()
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')

  it('올바른 SVG 문서이고 크기가 반복 칸 크기와 같다', () => {
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(doc.documentElement.getAttribute('width')).toBe(String(TILE_SIZE))
  })

  it('야구공·배트·글러브·베이스·별 다섯 가지가 모두 들어 있다', () => {
    const kinds = new Set([...doc.querySelectorAll('[data-item]')].map((g) => g.getAttribute('data-item')))
    expect([...kinds].sort()).toEqual([...DECORATION_ITEMS].sort())
  })

  it('외부 이미지·주소를 쓰지 않는다 (SVG 네임스페이스 선언만 있음)', () => {
    expect(svg).not.toMatch(/<image|href=|url\(|<text/)
    expect(svg.match(/https?:\/\//g)).toEqual(['http://'])
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
  })

  it('CSS용 data URL로 바꿀 수 있다', () => {
    expect(decorationUrl()).toMatch(/^url\("data:image\/svg\+xml,%3Csvg/)
  })
})
