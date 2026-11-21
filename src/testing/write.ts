import { screen } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'

/**
 * 글쓰기 칸을 연다: 커뮤니티 「글쓰기」·응원방 「응원 메시지 쓰기」 버튼으로 아래에서 올라오는 창을 열고 입력칸을 돌려준다.
 * 이미 열려 있으면(로그인하고 돌아왔을 때, 「이 선수 글쓰기」로 왔을 때) 그대로
 */
export async function openWriteBox(user: ReturnType<typeof userEvent.setup>, label: '글 내용' | '응원 메시지 내용' = '글 내용') {
  const open = screen.queryByRole('textbox', { name: label })
  if (open) return open
  await user.click(await screen.findByRole('button', { name: label === '글 내용' ? '글쓰기' : '응원 메시지 쓰기' }))
  return screen.findByRole('textbox', { name: label })
}
