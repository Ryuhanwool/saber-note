// 배경 장식: 야구 소품(야구공·배트·글러브·베이스·별)을 작게 흩뿌린 무늬. 외부 이미지 없이 코드로 그린 SVG.
// 선만 그린 검은 그림을 마스크로 쓰고, 색은 CSS(강조색)로 칠한다 → 테마·라이트·다크를 따라간다.
// 실제 구단 마스코트나 특정 팀을 떠올리게 하는 동물·캐릭터는 쓰지 않는다.

export const DECORATION_ITEMS = ['ball', 'bat', 'glove', 'base', 'star'] as const
export type DecorationItem = (typeof DECORATION_ITEMS)[number]

/** 반복 무늬 한 칸의 크기(px) */
export const TILE_SIZE = 240

// 소품 그림 (24×24 안에, 가운데 12,12 기준)
const SHAPES: Record<DecorationItem, string> = {
  ball: '<circle cx="12" cy="12" r="9"/><path d="M6.5 5.2c2.6 3.8 2.6 9.8 0 13.6M17.5 5.2c-2.6 3.8-2.6 9.8 0 13.6"/>',
  bat: '<path d="M4.5 20.5l1.5-1.5M6 19l11.8-11.8a2.4 2.4 0 0 0-3.4-3.4L2.6 15.6"/><path d="M3.3 21.7l2-2"/>',
  glove: '<path d="M7 21v-7l-2.5-3.5a1.4 1.4 0 0 1 2.3-1.6L8 10.5V4.5a1.3 1.3 0 0 1 2.6 0V10m0-6.5a1.3 1.3 0 0 1 2.6 0V10m0-5a1.3 1.3 0 0 1 2.6 0v6m0-3.5a1.3 1.3 0 0 1 2.6 0V15a6 6 0 0 1-6 6H7z"/>',
  base: '<path d="M5 4h14v8l-7 7-7-7z"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
}

// 한 칸 안의 배치: [소품, x, y, 회전(°), 크기(px)]. 고르게 흩어지도록 손으로 정했다
const LAYOUT: [DecorationItem, number, number, number, number][] = [
  ['ball', 20, 18, 0, 22], ['star', 112, 10, 12, 20], ['bat', 182, 34, -20, 28],
  ['glove', 62, 80, 8, 26], ['base', 150, 98, 0, 22], ['star', 214, 128, -15, 18],
  ['ball', 26, 150, 0, 20], ['bat', 96, 168, 35, 26], ['glove', 186, 196, -10, 24],
  ['star', 54, 214, 20, 18], ['base', 132, 216, 0, 20],
]

/** 반복 무늬 한 칸의 SVG 문서 */
export function decorationSvg(): string {
  const items = LAYOUT.map(([item, x, y, rot, size]) => {
    const s = (size / 24).toFixed(3)
    return `<g data-item="${item}" transform="translate(${x} ${y}) rotate(${rot} ${size / 2} ${size / 2}) scale(${s})">${SHAPES[item]}</g>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_SIZE}" height="${TILE_SIZE}" viewBox="0 0 ${TILE_SIZE} ${TILE_SIZE}" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${items}</svg>`
}

/** CSS에 넣을 data URL */
export const decorationUrl = () => `url("data:image/svg+xml,${encodeURIComponent(decorationSvg())}")`
