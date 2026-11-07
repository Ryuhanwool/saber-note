import { useEffect, useState } from 'react'

/** 현재 시각(ms). "5분 전" 같은 표시가 흘러가도록 intervalMs마다 갱신한다 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
