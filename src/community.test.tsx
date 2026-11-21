// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { openFold } from './testing/folds'
import { IDBFactory } from 'fake-indexeddb'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { createBrowserCommunity } from './data/community/browser'
import { createMemoryCommunity } from './data/community/memory'
import { getDataSource } from './data/registry'
import type { CommunityRepository } from './data/source'
import type { CommunityPost } from './data/types'
import { buildLeague } from './domain/league'
import CommunityProvider from './ui/community/CommunityProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

// jsdom은 scrollTo·파일 주소(createObjectURL)를 구현하지 않는다
window.scrollTo = () => {}
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}

const league = buildLeague(await getDataSource('demo').load())
const kim = league.pool.H[0]
const enc = encodeURIComponent

/** 로그인한 계정 (글에는 "나" 대신 닉네임이 보인다) */
const ME = { id: 'acct:me', name: '수달팬' }

function renderAt(path: string, repository: CommunityRepository = createMemoryCommunity({ user: ME })) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LeagueProvider>
        <CommunityProvider repository={repository}>
          <App />
        </CommunityProvider>
      </LeagueProvider>
    </MemoryRouter>,
  )
}

const otherPost = (over: Partial<CommunityPost> = {}): CommunityPost => ({
  id: 'p1', authorId: 'someone', authorName: '다른팬', text: `${kim.name} 오늘 수비 좋았다`, players: [kim.id], media: [],
  createdAt: Date.now() - 60_000, likes: [], reports: [], masked: false, caution: false, ...over,
})

afterEach(cleanup)

async function write(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(await screen.findByRole('textbox', { name: '글 내용' }), text)
}

describe('화면 7. 커뮤니티 글쓰기', () => {
  it('처음에는 빈 목록과 저장 위치 안내를 보여 준다', async () => {
    renderAt('/community')
    expect(await screen.findByText('아직 글이 없어요. 첫 글을 남겨 보세요.')).toBeTruthy()
    expect(screen.getByText(/새로고침하면 글이 사라져요/)).toBeTruthy() // 메모리 저장소 안내
  })

  it('글을 올리면 피드에 나오고, 본문 속 선수 이름이 자동으로 태그된다', async () => {
    const user = userEvent.setup()
    renderAt('/community')
    await write(user, `${kim.name} 오늘 홈런`)
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    expect(await screen.findByText('게시했어요.')).toBeTruthy()
    const feed = within(screen.getByLabelText('글 목록'))
    expect(feed.getByText(`${kim.name} 오늘 홈런`)).toBeTruthy()
    expect(feed.getByRole('button', { name: kim.name })).toBeTruthy() // 태그 칩
    expect(feed.getByText('수달팬')).toBeTruthy() // "나" 대신 닉네임
  })

  it('차단 표현은 이유와 표현을 알려 주고 게시 버튼을 막는다 (띄어 쓴 우회 표현 포함)', async () => {
    const user = userEvent.setup()
    renderAt('/community')
    await write(user, '니가 씨 발 뭘 알아')
    expect(screen.getByText(/인신공격\(다른 사용자\): ‘니가’와 ‘씨발’을 함께 썼어요/)).toBeTruthy()
    expect((screen.getByRole('button', { name: '게시하기' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('띄어 쓴 거친 표현도 ●로 가려 게시하고 "일부 가림"을 붙인다', async () => {
    const user = userEvent.setup()
    renderAt('/community')
    await write(user, '존 나 잘한다')
    expect(screen.getByText(/거친 표현\(존나\)은 「거친 표현 가리기」를 켠 사람에게 ●●로 보여요/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    const feed = within(screen.getByLabelText('글 목록'))
    expect(await feed.findByText('●●● 잘한다')).toBeTruthy()
    expect(feed.getByText('일부 가림')).toBeTruthy()
  })

  it('30초 안에 다시 올리면 막는다', async () => {
    const user = userEvent.setup()
    renderAt('/community')
    await write(user, '첫 글')
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    await screen.findByText('게시했어요.')
    await write(user, '둘째 글')
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    expect(screen.getByText(/30초에 한 번만 글을 올릴 수 있어요/)).toBeTruthy()
  })

  it('파일: 허용 형식만 미리보기에 붙고, 올리면 피드에 사진이 나온다', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderAt('/community')
    const input = (await screen.findByText('사진 · 움짤 · 영상 추가')).querySelector('input')!
    await user.upload(input, [new File(['png'], 'a.png', { type: 'image/png' }), new File(['txt'], 'b.txt', { type: 'text/plain' })])
    expect(screen.getByText(/b.txt: PNG, JPG, WEBP, GIF, MP4, WEBM 파일만/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'a.png 빼기' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    expect(await within(screen.getByLabelText('글 목록')).findByRole('img', { name: '사진' })).toBeTruthy()
  })

  it('선수 태그를 검색해 달고 뺄 수 있다', async () => {
    const user = userEvent.setup()
    renderAt('/community')
    await user.type(await screen.findByRole('combobox', { name: '선수 태그 검색' }), kim.name)
    await user.click(screen.getByRole('option', { name: new RegExp(kim.name) }))
    const chip = screen.getByRole('button', { name: `${kim.name} 태그 빼기` })
    await user.click(chip)
    expect(screen.queryByRole('button', { name: `${kim.name} 태그 빼기` })).toBeNull()
  })
})

describe('화면 7. 커뮤니티 피드', () => {
  it('좋아요를 켜고 끈다', async () => {
    const user = userEvent.setup()
    renderAt('/community', createMemoryCommunity({ posts: [otherPost()] }))
    const like = await screen.findByRole('button', { name: '좋아요 0' })
    await user.click(like)
    expect(await screen.findByRole('button', { name: '좋아요 1', pressed: true })).toBeTruthy()
  })

  it('신고는 두 번 눌러 확인하고, 3번 쌓이면 가린 뒤 원하면 펼쳐 볼 수 있다', async () => {
    const user = userEvent.setup()
    renderAt('/community', createMemoryCommunity({ posts: [otherPost({ reports: ['a', 'b'] })] }))
    await user.click(await screen.findByRole('button', { name: '신고' }))
    await user.click(screen.getByRole('button', { name: /한 번 더 누르면 신고/ }))
    expect(await screen.findByText(/신고가 누적돼 가려진 글이에요/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '그래도 보기' }))
    expect(screen.getByText(`${kim.name} 오늘 수비 좋았다`)).toBeTruthy()
    expect(screen.getByRole('button', { name: '신고함' })).toBeTruthy()
  })

  it('자기 글만 삭제할 수 있고, 두 번 눌러 확인한다', async () => {
    const user = userEvent.setup()
    renderAt('/community', createMemoryCommunity({ posts: [otherPost()] }))
    await screen.findByText(`${kim.name} 오늘 수비 좋았다`)
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull() // 남의 글
    await write(user, '내 글')
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    await user.click(await screen.findByRole('button', { name: '삭제' }))
    await user.click(screen.getByRole('button', { name: '한 번 더 누르면 삭제' }))
    await waitFor(() => expect(screen.queryByText('내 글')).toBeNull())
  })

  it('선수 관련 글·사진만 걸러 보기와 이번 주 많이 이야기된 선수', async () => {
    const user = userEvent.setup()
    const posts = [otherPost(), otherPost({ id: 'p2', text: '다른 이야기', players: [] })]
    renderAt('/community', createMemoryCommunity({ posts }))
    const aside = within((await screen.findByText('이번 주 많이 이야기된 선수')).parentElement!)
    await user.click(aside.getByRole('button', { name: new RegExp(kim.name) }))
    expect(screen.getByRole('button', { name: `${kim.name} 관련 글 ✕` })).toBeTruthy()
    expect(screen.queryByText('다른 이야기')).toBeNull()
    await user.click(screen.getByRole('button', { name: '전체' }))
    expect(screen.getByText('다른 이야기')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '사진·영상만' }))
    expect(screen.getByText('아직 글이 없어요. 첫 글을 남겨 보세요.')).toBeTruthy()
  })
})

describe('선수 카드 연동', () => {
  it('관련 글 수·최근 24시간 글 수·최근 글을 보여 주고, 관련 글 모두 보기로 걸러 본다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${enc(kim.id)}`, createMemoryCommunity({ posts: [otherPost(), otherPost({ id: 'p2', createdAt: Date.now() - 2 * 86400_000 })] }))
    const panel = within(await screen.findByLabelText('커뮤니티 이야기'))
    expect(await panel.findByText(/최근 24시간 1개/)).toBeTruthy()
    expect(panel.getByText('2개')).toBeTruthy()
    await openFold(user, '커뮤니티 이야기', screen.getByLabelText('커뮤니티 이야기'))
    await user.click(panel.getByRole('button', { name: '관련 글 모두 보기' }))
    expect(await screen.findByRole('button', { name: `${kim.name} 관련 글 ✕` })).toBeTruthy()
  })

  it('이 선수 글쓰기를 누르면 태그가 달린 글쓰기 칸으로 간다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${enc(kim.id)}`)
    const panel = within(await screen.findByLabelText('커뮤니티 이야기'))
    expect(await panel.findByText('아직 이 선수 이야기가 없어요. 첫 글을 남겨 보세요.')).toBeTruthy()
    await openFold(user, '커뮤니티 이야기', screen.getByLabelText('커뮤니티 이야기'))
    await user.click(panel.getByRole('button', { name: '이 선수 글쓰기' }))
    expect(await screen.findByRole('button', { name: `${kim.name} 태그 빼기` })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: '글 내용' }))
  })
})

describe('브라우저 저장소로 새로고침', () => {
  it('글을 올린 뒤 화면을 새로 열어도 글이 남아 있다', async () => {
    const indexedDB = new IDBFactory()
    const user = userEvent.setup()
    const first = createBrowserCommunity({ indexedDB })
    const view = renderAt('/community', first)
    expect(await screen.findByText(/이 브라우저에만 저장돼요/)).toBeTruthy()
    await write(user, '남아 있어야 하는 글')
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    await screen.findByText('게시했어요.')
    view.unmount()
    first.close()

    const second = createBrowserCommunity({ indexedDB })
    renderAt('/community', second)
    expect(await screen.findByText('남아 있어야 하는 글')).toBeTruthy()
    expect(screen.getByRole('button', { name: '삭제' })).toBeTruthy() // 같은 로컬 사용자라 내 글로 보인다
    second.close()
  })
})
