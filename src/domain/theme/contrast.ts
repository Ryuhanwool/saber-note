// 글자 대비 계산 (WCAG 2.x). 테마 색과 반투명 막이 읽기 기준(4.5:1)을 지키는지 테스트에서 쓴다.

const channel = (v: number) => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(channel)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** 두 색의 대비 (1~21) */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** top 색을 opacity(0~1)로 bottom 위에 겹친 색 */
export function blend(top: string, bottom: string, opacity: number): string {
  const t = rgb(top), b = rgb(bottom)
  return '#' + t.map((v, i) => Math.round(v * opacity + b[i] * (1 - opacity)).toString(16).padStart(2, '0')).join('')
}
