import { useEffect, useRef, useState } from 'react'

/**
 * 글 본문. 휴대폰 폭에서는 3줄까지만 보이고(CSS), 넘치면 「더 보기」로 펼친다.
 * 넘치는지는 화면에 그려진 뒤 재므로, 넓은 화면·테스트 환경(레이아웃 없음)에서는 버튼이 나오지 않는다
 */
export default function ClampText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  const [overflow, setOverflow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || open) return
    const check = () => setOverflow(el.scrollHeight > el.clientHeight + 1)
    check()
    if (typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text, open])
  return (
    <>
      <p ref={ref} className={`ptext${open ? '' : ' clamp'}`}>{text}</p>
      {overflow && !open && <button type="button" className="linkbtn ptext-more" onClick={() => setOpen(true)}>더 보기</button>}
    </>
  )
}
