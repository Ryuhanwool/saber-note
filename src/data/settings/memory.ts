// 메모리 설정 저장소: 새로고침하면 사라진다. 브라우저 저장소를 쓸 수 없을 때의 대체와 테스트용.
import type { SettingsStore } from '../source'
import type { DisplaySettings } from '../types'
import { normalizeSettings } from './shared'

export function createMemorySettings(initial: Partial<DisplaySettings> = {}): SettingsStore {
  let settings = normalizeSettings(initial)
  let background: Blob | null = null
  return {
    persistent: false,
    async load() {
      return { ...settings }
    },
    async save(next) {
      settings = normalizeSettings(next)
    },
    async loadBackground() {
      return background
    },
    async saveBackground(image) {
      background = image
    },
  }
}
