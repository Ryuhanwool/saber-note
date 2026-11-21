// @vitest-environment jsdom
// 시연 첫 화면: 저장소를 따로 넣지 않고 앱이 여는 그대로(registry → 브라우저 저장소 + 예시 글) 확인한다
import 'fake-indexeddb/auto'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IDBFactory } from 'fake-indexeddb'
import { openFold } from './testing/folds'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { seedStars } from './data/seedPlayers'
import App from './App'
import { createMemoryAuth } from './data/auth/memory'
import { DEMO_ACCOUNT_ID, DEMO_ACCOUNT_NICKNAME } from './data/types'
import AuthProvider from './ui/auth/AuthProvider'
import { getDataSource } from './data/registry'
import CommunityProvider from './ui/community/CommunityProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

window.scrollTo = () => {}
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}

const ds = await getDataSource('demo').load()
const slugger = seedStars(ds).sluggers[0]

/** 데모 계정으로 로그인한 상태 (글쓰기·신고·응원은 로그인이 필요하다) */
const signedInDemo = () => createMemoryAuth({ signedIn: { id: DEMO_ACCOUNT_ID, nickname: DEMO_ACCOUNT_NICKNAME, team: null, createdAt: 0 } })

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LeagueProvider>
        <AuthProvider repository={signedInDemo()}>
          <CommunityProvider>
            <App />
          </CommunityProvider>
        </AuthProvider>
      </LeagueProvider>
    </MemoryRouter>,
  )
}

afterEach(cleanup)
// 테스트마다 빈 브라우저 저장소에서 시작한다 (앱은 열 때 전역 indexedDB를 쓴다)
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe('시연 첫 화면: 커뮤니티', () => {
  it('처음 열어도 "데모 게시글" 예시 글이 보이고, 사진 예시가 하나 있다', async () => {
    renderApp('/community')
    const feed = within(await screen.findByLabelText('글 목록'))
    expect(await feed.findAllByText('데모 게시글')).toHaveLength(7)
    expect(feed.getByText(new RegExp(`${slugger.name} 어제 넘긴 홈런 타구`))).toBeTruthy()
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
    await openFold(userEvent.setup(), '커뮤니티 이야기', screen.getByLabelText('커뮤니티 이야기'))
    expect(panel.getAllByText(/데모 게시글/).length).toBeGreaterThan(0)
  })
})

describe('시연: 신고와 시연 데이터 초기화', () => {
  const reportedText = /^\[신고 시연용\]/
  const feed = () => within(screen.getByLabelText('글 목록'))
  const reportedCard = () => feed().getByText(reportedText).closest('article') as HTMLElement
  /** 커뮤니티가 열리고 예시 글이 나올 때까지 기다린다 */
  const loaded = async () => within(await screen.findByLabelText('글 목록')).findAllByText('데모 게시글')

  it('신고가 2번 쌓인 예시 글을 신고하면 3번이 되어 가려지고, 펼쳐 볼 수 있다', async () => {
    const user = userEvent.setup()
    renderApp('/community')
    await loaded()
    const card = within(reportedCard())
    await user.click(card.getByRole('button', { name: '신고' }))
    await user.click(card.getByRole('button', { name: /한 번 더 누르면 신고/ }))
    expect(await feed().findByText(/신고가 누적돼 가려진 글이에요/)).toBeTruthy()
    expect(feed().queryByText(reportedText)).toBeNull()
    await user.click(feed().getByRole('button', { name: '그래도 보기' }))
    expect(feed().getByText(reportedText)).toBeTruthy()
  })

  it('초기화는 한 번 더 확인하고, 취소하면 아무것도 지우지 않는다', async () => {
    const user = userEvent.setup()
    renderApp('/community')
    await loaded()
    await user.type(screen.getByRole('textbox', { name: '글 내용' }), '시연 중에 쓴 글')
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    await feed().findByText('시연 중에 쓴 글')
    await user.click(screen.getByRole('button', { name: '시연 데이터 초기화' }))
    expect(screen.getByRole('alertdialog', { name: '초기화 확인' }).textContent).toContain('되돌릴 수 없어요')
    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(feed().getByText('시연 중에 쓴 글')).toBeTruthy()
  })

  it('초기화하면 내가 쓴 글과 좋아요·신고가 지워지고 예시 글이 처음 상태로 돌아간다', async () => {
    const user = userEvent.setup()
    renderApp('/community')
    await loaded()
    // 시연 중에 글을 쓰고, 좋아요를 누르고, 신고 시연용 글을 가린다
    await user.type(screen.getByRole('textbox', { name: '글 내용' }), '시연 중에 쓴 글')
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    await feed().findByText('시연 중에 쓴 글')
    await user.click(feed().getAllByRole('button', { name: '좋아요 0' })[1])
    await feed().findByRole('button', { name: '좋아요 1' })
    const card = within(reportedCard())
    await user.click(card.getByRole('button', { name: '신고' }))
    await user.click(card.getByRole('button', { name: /한 번 더 누르면 신고/ }))
    await feed().findByText(/신고가 누적돼 가려진 글이에요/)

    await user.click(screen.getByRole('button', { name: '시연 데이터 초기화' }))
    await user.click(screen.getByRole('button', { name: '초기화' }))
    expect(await screen.findByText(/^시연 데이터를 처음 상태로 되돌렸어요/)).toBeTruthy()
    expect(feed().queryByText('시연 중에 쓴 글')).toBeNull()
    expect(feed().queryByRole('button', { name: '좋아요 1' })).toBeNull()
    expect(feed().queryByText(/신고가 누적돼 가려진 글이에요/)).toBeNull()
    expect(within(reportedCard()).getByRole('button', { name: '신고' })).toBeTruthy() // 다시 신고 시연을 할 수 있다
    expect(feed().getAllByText('데모 게시글')).toHaveLength(7)
  })
})
