import { useCallback, useSyncExternalStore } from 'react'

/** 화면 폭 조건이 맞는지 (matchMedia가 없는 환경 — 테스트 등 — 에서는 false) */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const m = window.matchMedia(query)
      m.addEventListener('change', notify)
      return () => m.removeEventListener('change', notify)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches, () => false)
}

/** 휴대폰 폭 (base.css의 720px 기준과 같다): 위쪽 메뉴 대신 아래쪽 탭 바 */
export const PHONE_QUERY = '(max-width: 720px)'
