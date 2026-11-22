import { useEffect, useState } from 'react'

/** 「맨 위로」: 화면 2개보다 긴 화면에서, 한 화면 넘게 내려왔을 때만 보인다 (맨 위 근처에서는 숨김) */
export default function ToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const check = () => {
      const long = document.documentElement.scrollHeight > window.innerHeight * 2
      setShow(long && window.scrollY > window.innerHeight)
    }
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])
  if (!show) return null
  const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <button type="button" className="to-top" aria-label="맨 위로" title="맨 위로" onClick={() => window.scrollTo?.({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M6 14l6-6 6 6M12 8v11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  )
}
