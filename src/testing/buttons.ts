// 화면 테스트 도우미
import { screen, waitFor } from '@testing-library/react'

/**
 * 버튼을 찾고 활성이 될 때까지 기다린다.
 * findByRole은 비활성 버튼도 찾고, user-event는 비활성 버튼 클릭을 조용히 무시한다.
 * 저장소가 열릴 때까지 비활성인 버튼(공식 스토어 「담기」 등)을 바로 누르면, 기기가 바쁠 때 클릭이 사라진다.
 */
export async function findEnabledButton(name: string | RegExp): Promise<HTMLButtonElement> {
  const b = (await screen.findByRole('button', { name })) as HTMLButtonElement
  await waitFor(() => {
    if (b.disabled) throw new Error(`「${String(name)}」 버튼이 아직 비활성이에요`)
  })
  return b
}
