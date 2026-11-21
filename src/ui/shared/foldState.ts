import { useCallback, useSyncExternalStore } from 'react'

// 접었다 펴는 묶음의 열림 상태. 화면을 옮겨 다녀도 새로고침 전까지 기억한다(메모리에만 — 새로고침하면 다시 접힘).
// 묶음 종류(예: 'defense:overall')로 기억해서, 다른 선수 카드를 열어도 같은 묶음은 펼친 채로 보인다.
const open = new Map<string, boolean>()
const listeners = new Set<() => void>()

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function setFoldOpen(id: string, value: boolean) {
  open.set(id, value)
  listeners.forEach((l) => l())
}

/** 테스트용: 모든 묶음을 처음(접힘) 상태로 */
export function resetFolds() {
  open.clear()
  listeners.forEach((l) => l())
}

export function useFold(id: string): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(subscribe, () => open.get(id) ?? false, () => false)
  const set = useCallback((v: boolean) => setFoldOpen(id, v), [id])
  return [value, set]
}
