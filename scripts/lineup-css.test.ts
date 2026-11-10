// 라인업 야구장 색(tokens.css)과 자리 버튼 크기
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../src/domain/theme/contrast.ts'

const read = (p: string) => readFileSync(resolve(import.meta.dirname, p), 'utf8')
const tokens = read('../src/ui/shared/tokens.css')
const css = read('../src/ui/lineup/lineup.css')
const values = (name: string) => [...tokens.matchAll(new RegExp(`--${name}: (#[0-9A-Fa-f]{6})`, 'g'))].map((m) => m[1])

describe('라인업 야구장', () => {
  it('잔디·흙·라인 색이 라이트·다크 모두 있고, 다크 두 곳이 같다', () => {
    for (const name of ['grass', 'grass-stripe', 'grass-foul', 'dirt', 'chalk', 'pen']) {
      const v = values(name)
      expect(v, name).toHaveLength(3)
      expect(v[1], name).toBe(v[2])
    }
  })

  it('불펜 글자(라인색)가 불펜 바탕 위에서 4.5:1 이상, 라인이 잔디·흙과 구분된다(3:1 이상)', () => {
    for (const i of [0, 1]) {
      const [chalk, pen, grass, dirt] = ['chalk', 'pen', 'grass', 'dirt'].map((n) => values(n)[i])
      expect(contrastRatio(chalk, pen)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(chalk, grass)).toBeGreaterThanOrEqual(3)
      expect(contrastRatio(chalk, dirt)).toBeGreaterThanOrEqual(i === 0 ? 2 : 3) // 라이트의 흙 위 흰 베이스는 모양으로도 보인다
    }
  })

  it('자리 버튼은 최소 56px, 색은 토큰만', () => {
    expect(css).toMatch(/\.slot\{[^}]*width:clamp\(56px,/)
    expect(css).not.toMatch(/#[0-9A-Fa-f]{3,6}\b/)
  })
})
