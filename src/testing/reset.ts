import { screen, within } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'

/** 화면 설정(톱니바퀴) 창을 열고 맨 아래 「시연 데이터 초기화」 영역을 돌려준다 */
export async function openDemoReset(user: ReturnType<typeof userEvent.setup>) {
  if (!screen.queryByRole('dialog', { name: '화면 설정' })) await user.click(await screen.findByRole('button', { name: '화면 설정' }))
  return within(await screen.findByRole('region', { name: '시연 데이터 초기화' }))
}
