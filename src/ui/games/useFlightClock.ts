import { useCallback, useEffect, useRef, useState } from 'react'

const frame = (cb: (now: number) => void): (() => void) => {
  if (typeof window.requestAnimationFrame === 'function') {
    const id = window.requestAnimationFrame(cb)
    return () => window.cancelAnimationFrame(id)
  }
  const id = setTimeout(() => cb(performance.now()), 16)
  return () => clearTimeout(id)
}

/**
 * 타구 애니메이션 시계: 0 → 1로 진행하고 끝나면 멈춘다. runKey(새 타구)가 바뀌면 처음부터 다시.
 * reduced(동작 줄이기)면 바로 마지막 장면(1). skip은 바로 끝으로, replay는 처음부터 다시.
 */
export function useFlightClock(durationMs: number, runKey: string, reduced: boolean) {
  const [replays, setReplays] = useState(0)
  const key = `${runKey}#${replays}`
  const [state, setState] = useState<{ key: string; progress: number }>({ key, progress: 0 })
  const cancel = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (reduced) return
    let start: number | null = null
    const tick = (now: number) => {
      start ??= now
      const progress = Math.min(1, (now - start) / durationMs)
      setState({ key, progress })
      cancel.current = progress < 1 ? frame(tick) : null
    }
    cancel.current = frame(tick)
    return () => {
      cancel.current?.()
      cancel.current = null
    }
  }, [key, durationMs, reduced])

  const progress = reduced ? 1 : state.key === key ? state.progress : 0
  const skip = useCallback(() => {
    cancel.current?.()
    cancel.current = null
    setState({ key, progress: 1 })
  }, [key])
  const replay = useCallback(() => setReplays((n) => n + 1), [])
  return { progress, done: progress >= 1, skip, replay }
}
