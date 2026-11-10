import { useEffect, useRef, useState } from 'react'

/** 아이콘 버튼 옆에 뜨는 창: Esc나 바깥을 누르면 닫고, 닫히면 버튼으로 초점을 돌린다 */
export function usePopover<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<T>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (focusButton: boolean) => {
      setOpen(false)
      if (focusButton) buttonRef.current?.focus()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(true)
    const onDown = (e: PointerEvent) => wrapRef.current && !wrapRef.current.contains(e.target as Node) && close(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])
  return { open, setOpen, wrapRef, buttonRef }
}
