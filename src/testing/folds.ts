import { screen, within } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 접힌 묶음(Fold)을 펼친다. 열림 상태는 새로고침 전까지(테스트 파일 안에서) 기억되므로, 이미 펼쳐져 있으면 누르지 않는다.
 * title은 묶음 제목의 앞부분 (버튼 이름 = 제목 + 요약 + 펼치기)
 */
export async function openFold(user: ReturnType<typeof userEvent.setup>, title: string, container?: HTMLElement) {
  const q = container ? within(container) : screen
  const btn = await q.findByRole('button', { name: new RegExp(`^${esc(title)}`) })
  if (btn.getAttribute('aria-expanded') !== 'true') await user.click(btn)
  return btn
}
