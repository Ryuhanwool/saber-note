import { useEffect, useState } from 'react'

/** 지금 시각 (ms). everyMs마다(기본 1분) 다시 그린다 — 남은 시간·새 글 수처럼 시간이 지나면 바뀌는 표시용 */
export function useNow(everyMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(t)
  }, [everyMs])
  return now
}
