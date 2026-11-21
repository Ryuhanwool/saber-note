import { useState } from 'react'

/** 한 번에 보여 주는 개수 (가치 순위표·피드·상품 목록) */
export const PAGE_SIZE = 20

/**
 * 긴 목록을 처음 PAGE_SIZE개만 보여 주고 「더 보기」로 이어 본다. resetKey(필터 등)가 바뀌면 다시 처음 개수로.
 */
export function usePaged<T>(items: readonly T[], resetKey: string, size = PAGE_SIZE) {
  const [state, setState] = useState({ key: resetKey, count: size })
  const count = state.key === resetKey ? state.count : size
  return {
    shown: items.slice(0, count),
    total: items.length,
    rest: Math.max(0, items.length - count),
    more: () => setState({ key: resetKey, count: count + size }),
  }
}
