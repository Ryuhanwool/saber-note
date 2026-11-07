// 상품 그림: 외부 이미지 없이 코드로 그린 단순한 SVG. 실제 구단의 디자인·로고는 쓰지 않고, 가상 구단 색과 짧은 이름만 넣는다.
import type { GoodsCategory } from '../../data/types'
import type { TeamColors } from './catalog'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const NEUTRAL: TeamColors = { main: '#5C6B7A', sub: '#E4EAE3' }

function body(category: GoodsCategory, c: TeamColors, mark: string): string {
  const m = esc(mark)
  switch (category) {
    case 'uniform':
      return `<path d="M70 40 L100 52 L130 40 L165 62 L150 92 L135 85 L135 165 L65 165 L65 85 L50 92 L35 62 Z" fill="${c.sub}" stroke="${c.main}" stroke-width="4" stroke-linejoin="round"/>
<path d="M100 52 L100 165" stroke="${c.main}" stroke-width="2" stroke-dasharray="4 5"/>
<text x="100" y="118" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="700" fill="${c.main}">${m}</text>`
    case 'cap':
      return `<path d="M45 120 Q45 55 100 55 Q155 55 155 120 Z" fill="${c.main}"/>
<path d="M40 120 L175 120 Q180 140 150 140 L40 140 Z" fill="${c.sub}" stroke="${c.main}" stroke-width="3"/>
<circle cx="100" cy="56" r="5" fill="${c.sub}"/>
<text x="100" y="105" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="${c.sub}">${m}</text>`
    case 'towel':
      return `<rect x="25" y="70" width="150" height="60" rx="6" fill="${c.main}"/>
<rect x="25" y="70" width="150" height="10" fill="${c.sub}"/><rect x="25" y="120" width="150" height="10" fill="${c.sub}"/>
<text x="100" y="109" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="${c.sub}">${m}</text>`
    case 'stick':
      return `<rect x="88" y="40" width="24" height="100" rx="12" fill="${c.sub}" stroke="${c.main}" stroke-width="4"/>
<rect x="84" y="138" width="32" height="32" rx="6" fill="${c.main}"/>
<path d="M60 55 L75 65 M140 55 L125 65 M55 90 L72 90 M145 90 L128 90" stroke="${c.main}" stroke-width="4" stroke-linecap="round"/>`
    case 'bat':
      return `<path d="M55 160 L140 45 Q150 35 158 43 Q165 52 155 60 L70 168 Z" fill="${c.sub}" stroke="${c.main}" stroke-width="4" stroke-linejoin="round"/>
<circle cx="60" cy="166" r="9" fill="${c.main}"/>`
    case 'keyring':
      return `<circle cx="100" cy="55" r="16" fill="none" stroke="${c.main}" stroke-width="5"/>
<circle cx="100" cy="115" r="42" fill="${c.main}"/>
<path d="M78 100 Q100 120 78 140 M122 100 Q100 120 122 140" fill="none" stroke="${c.sub}" stroke-width="3"/>`
    default:
      return `<rect x="50" y="60" width="100" height="90" rx="8" fill="${c.sub}" stroke="${c.main}" stroke-width="4"/>
<path d="M50 85 L150 85 M100 60 L100 150" stroke="${c.main}" stroke-width="4"/>`
  }
}

/** 상품 그림 SVG 문자열 (200×200). colors가 없으면 중립 색 (팬 마켓의 사진 없는 판매글) */
export function goodsSvg(category: GoodsCategory, colors: TeamColors | null, mark = ''): string {
  const c = colors ?? NEUTRAL
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="#F4F6F2"/>${body(category, c, mark)}</svg>`
}

/** img src로 쓸 data 주소 */
export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
