// @vitest-environment jsdom
// 시연 첫 화면: 저장소를 따로 넣지 않고 앱이 여는 그대로(registry → 브라우저 저장소 + 예시 글) 확인한다
import 'fake-indexeddb/auto'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { getDataSource } from './data/registry'
import CommunityProvider from './ui/community/CommunityProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

window.scrollTo = () => {}
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}

const ds = await getDataSource('demo').load()
const slugger = ds.hitters.reduce((a, b) => (b.HR > a.HR ? b : a))

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LeagueProvider>
        <CommunityProvider>
          <App />
        </CommunityProvider>
      </LeagueProvider>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('시연 첫 화면: 커뮤니티', () => {
  it('처음 열어도 "데모 게시글" 예시 글이 보이고, 사진 예시가 하나 있다', async () => {
    renderApp('/community')
    const feed = within(await screen.findByLabelText('글 목록'))
    expect(await feed.findAllByText('데모 게시글')).toHaveLength(5)
    expect(feed.getByText(new RegExp(`${slugger.name} 벌써 홈런 ${slugger.HR}개`))).toBeTruthy()
    expect(await feed.findByRole('img', { name: '사진' })).toBeTruthy()
    expect(feed.queryByRole('button', { name: '삭제' })).toBeNull() // 예시 글은 지울 수 없다
  })

  it('"시연용이라 글이 이 브라우저에만 저장돼요" 안내가 늘 보인다', async () => {
    renderApp('/community')
    expect(await screen.findByText(/^시연용이라 글이 이 브라우저에만 저장돼요\. 새로고침해도 남지만/)).toBeTruthy()
  })

  it('예시 글이 이번 주 많이 이야기된 선수와 선수 카드에도 잡힌다', async () => {
    renderApp(`/player/${encodeURIComponent(slugger.id)}`)
    const panel = within(await screen.findByLabelText('커뮤니티 이야기'))
    expect(await panel.findByText(/이 선수 관련 글/)).toBeTruthy()
    expect(panel.getAllByText(/데모 게시글/).length).toBeGreaterThan(0)
  })
})
