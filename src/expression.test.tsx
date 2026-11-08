// @vitest-environment jsdom
// 커뮤니티 표현 범위: 경고 후 선택, 「주의」 표시, 읽는 사람의 「거친 표현 가리기」
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { createMemoryCommunity } from './data/community/memory'
import { getDataSource } from './data/registry'
import { createMemorySettings } from './data/settings/memory'
import type { CommunityRepository, SettingsStore } from './data/source'
import type { CommunityPost } from './data/types'
import CommunityProvider from './ui/community/CommunityProvider'
import SettingsProvider from './ui/settings/SettingsProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

window.scrollTo = () => {}
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}

const ds = await getDataSource('demo').load()
const kim = ds.hitters[0]

function renderApp(opts: { community?: CommunityRepository; settings?: SettingsStore } = {}) {
  const tree = (
    <LeagueProvider>
      <CommunityProvider repository={opts.community ?? createMemoryCommunity()}>
        <App />
      </CommunityProvider>
    </LeagueProvider>
  )
  return render(
    <MemoryRouter initialEntries={['/community']}>
      {opts.settings ? <SettingsProvider store={opts.settings}>{tree}</SettingsProvider> : tree}
    </MemoryRouter>,
  )
}

const otherPost = (text: string, over: Partial<CommunityPost> = {}): CommunityPost => ({
  id: crypto.randomUUID(), authorId: 'someone', authorName: '다른팬', text, players: [], media: [], createdAt: Date.now() - 60_000,
  likes: [], reports: [], masked: false, caution: false, ...over,
})
const feed = () => within(screen.getByLabelText('글 목록'))
/** 커뮤니티가 열릴 때까지 기다린 뒤의 글 목록 */
const loadedFeed = async () => within(await screen.findByLabelText('글 목록'))
const write = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  const box = await screen.findByRole('textbox', { name: '글 내용' })
  await user.clear(box)
  await user.type(box, text)
}

afterEach(cleanup)

describe('애매한 글: 경고 후 선택', () => {
  it('게시 전에 이유와 함께 묻고, 「고쳐 쓰기」를 고르면 올리지 않고 글 칸으로 돌아간다', async () => {
    const user = userEvent.setup()
    renderApp()
    await write(user, `${kim.name} ㅂㅅ`)
    expect(screen.getByText(/선수·심판·감독 자체를 욕한 것으로 보일 수 있어요/)).toBeTruthy() // 쓰는 중에도 미리 알림
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    const dialog = within(screen.getByRole('alertdialog', { name: '게시 전 확인' }))
    expect(dialog.getByText(/「주의」 표시가 붙고/)).toBeTruthy()
    await user.click(dialog.getByRole('button', { name: '고쳐 쓰기' }))
    expect(screen.queryByRole('alertdialog', { name: '게시 전 확인' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: '글 내용' }))
    expect(screen.getByText('아직 글이 없어요. 첫 글을 남겨 보세요.')).toBeTruthy()
  })

  it('「그래도 올리기」를 고르면 「주의」 표시가 붙고 걸린 표현은 가린 채로 올라간다', async () => {
    const user = userEvent.setup()
    renderApp()
    await write(user, `${kim.name} ㅂㅅ`)
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    await user.click(screen.getByRole('button', { name: '그래도 올리기' }))
    expect(await feed().findByText(`${kim.name} ●●`)).toBeTruthy()
    expect(feed().getByText('주의')).toBeTruthy()
    expect(screen.getByText('게시했어요. 「주의」 표시가 붙었어요.')).toBeTruthy()
  })

  it('차단되는 글은 묻지 않고 이유를 알려 주며 막는다', async () => {
    const user = userEvent.setup()
    renderApp()
    await write(user, `${kim.name} 얼굴부터 좆같이 생김`)
    expect(screen.getByText(/인신공격\(선수·심판·감독\)/)).toBeTruthy()
    expect((screen.getByRole('button', { name: '게시하기' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('플레이에 대한 욕은 묻지 않고 바로 올라가고, 기본 설정에서는 가려 보인다', async () => {
    const user = userEvent.setup()
    renderApp()
    await write(user, `${kim.name} 오늘 볼질 좆같네`)
    await user.click(screen.getByRole('button', { name: '게시하기' }))
    expect(await feed().findByText(`${kim.name} 오늘 볼질 ●같네`)).toBeTruthy()
    expect(feed().queryByText('주의')).toBeNull()
    expect(feed().getByText('일부 가림')).toBeTruthy()
  })
})

describe('읽는 사람의 「거친 표현 가리기」', () => {
  it('끄면 허용된 욕은 그대로 보이고, 「주의」 글의 표현은 그래도 가려진다', async () => {
    const posts = [otherPost('오늘 수비 진짜 좆같네'), otherPost('새끼들 정신 좀 차려라', { caution: true })]
    renderApp({ community: createMemoryCommunity({ posts }), settings: createMemorySettings({ maskProfanity: false, decorations: false }) })
    expect(await (await loadedFeed()).findByText('오늘 수비 진짜 좆같네')).toBeTruthy()
    expect(feed().getByText('●●들 정신 좀 차려라')).toBeTruthy()
  })

  it('화면 설정에서 켜고 끌 수 있고 저장된다 (기본값 켜짐)', async () => {
    const user = userEvent.setup()
    const settings = createMemorySettings({ decorations: false })
    renderApp({ community: createMemoryCommunity({ posts: [otherPost('씨발 홈런 미쳤다')] }), settings })
    expect(await (await loadedFeed()).findByText('●● 홈런 미쳤다')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '화면 설정' }))
    const toggle = within(screen.getByRole('dialog', { name: '화면 설정' })).getByRole('checkbox', { name: /거친 표현 가리기/ })
    expect((toggle as HTMLInputElement).checked).toBe(true)
    await user.click(toggle)
    expect(feed().getByText('씨발 홈런 미쳤다')).toBeTruthy()
    expect((await settings.load()).maskProfanity).toBe(false)
  })

  it('예전 방식으로 ●를 넣어 저장한 글도 그대로 보인다', async () => {
    renderApp({ community: createMemoryCommunity({ posts: [otherPost('●● 잘한다', { masked: true })] }) })
    expect(await (await loadedFeed()).findByText('●● 잘한다')).toBeTruthy()
    expect(feed().getByText('일부 가림')).toBeTruthy()
  })
})
