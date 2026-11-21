// @vitest-environment jsdom
// 화면 8. 선수 응원방: 선수 카드 버튼, 응원하기, 응원 메시지(작성 제한), 이번 주 응원 순위, 시연 데이터 초기화
import 'fake-indexeddb/auto'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { openWriteBox } from './testing/write'
import { IDBFactory } from 'fake-indexeddb'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { seedStars } from './data/seedPlayers'
import App from './App'
import { createMemoryAuth } from './data/auth/memory'
import { DEMO_ACCOUNT_ID, DEMO_ACCOUNT_NICKNAME } from './data/types'
import AuthProvider from './ui/auth/AuthProvider'
import { createMemoryCheer } from './data/cheer/memory'
import { demoCheerSeeds } from './data/cheer/seed'
import { createMemoryCommunity } from './data/community/memory'
import { getDataSource } from './data/registry'
import type { CheerRepository } from './data/source'
import CheerProvider from './ui/cheer/CheerProvider'
import CommunityProvider from './ui/community/CommunityProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

window.scrollTo = () => {}
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}

const ds = await getDataSource('demo').load()
const seeds = demoCheerSeeds(ds)
const stars = seedStars(ds)
const slugger = stars.sluggers[0]
const ace = stars.ace!
const enc = encodeURIComponent
const sluggerTotal = seeds.cheers.filter((c) => c.playerId === slugger.id).length // 34 (이번 주 14)

/** 데모 계정으로 로그인한 상태 (글쓰기·신고·응원은 로그인이 필요하다) */
const signedInDemo = () => createMemoryAuth({ signedIn: { id: DEMO_ACCOUNT_ID, nickname: DEMO_ACCOUNT_NICKNAME, team: null, createdAt: 0 } })

/** 저장소를 넣지 않으면 앱이 여는 그대로 (registry → 브라우저 저장소 + 예시 글·예시 응원) */
function renderAt(path: string, cheer?: CheerRepository) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LeagueProvider>
        <AuthProvider repository={signedInDemo()}>
          <CommunityProvider repository={cheer ? createMemoryCommunity() : undefined}>
            <CheerProvider repository={cheer}>
              <App />
            </CheerProvider>
          </CommunityProvider>
        </AuthProvider>
      </LeagueProvider>
    </MemoryRouter>,
  )
}

/** 로그인한 계정 */
const ME = { id: 'acct:me', name: '수달팬' }
const room = (id = slugger.id) => `/player/${enc(id)}/cheer`
const messages = async () => within(await screen.findByLabelText('응원 메시지 목록'))

afterEach(cleanup)
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe('선수 카드의 「응원방」 버튼', () => {
  it('누적 응원 수를 보여 주고, 누르면 그 선수 응원방으로 간다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${enc(slugger.id)}`, createMemoryCheer({ seeds, user: ME }))
    await user.click(await screen.findByRole('button', { name: `응원방 · 응원 ${sluggerTotal}` }))
    expect(await screen.findByRole('heading', { name: `${slugger.name} 응원방` })).toBeTruthy()
    expect((await messages()).getAllByText('데모 응원')).toHaveLength(3)
  })

  it('없는 선수 응원방은 안내를 보여 준다', async () => {
    renderAt('/player/demo%3A99999/cheer', createMemoryCheer({ user: ME }))
    expect(await screen.findByText('선수를 찾을 수 없어요.')).toBeTruthy()
  })
})

describe('응원하기', () => {
  it('누르면 누적 수가 1 오르고, 오늘은 다시 누를 수 없다', async () => {
    const user = userEvent.setup()
    renderAt(room(), createMemoryCheer({ seeds, user: ME }))
    const count = await screen.findByLabelText('누적 응원 수')
    expect(count.textContent).toBe(`${sluggerTotal} 누적 응원`)
    expect(screen.getByText(/^이번 주 14 ·/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '📣 응원하기' }))
    await waitFor(() => expect(count.textContent).toBe(`${sluggerTotal + 1} 누적 응원`))
    expect(screen.getByText(/^이번 주 15 ·/)).toBeTruthy()
    expect(screen.getByText(`${slugger.name} 선수를 응원했어요! 내일 또 응원할 수 있어요.`)).toBeTruthy()
    expect((screen.getByRole('button', { name: '오늘 응원했어요' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('이번 주 응원 순위: 최근 7일 응원 수 순, 누르면 그 선수 응원방으로', async () => {
    const user = userEvent.setup()
    renderAt(room(), createMemoryCheer({ seeds, user: ME }))
    const rank = within(await screen.findByLabelText('이번 주 응원 순위'))
    const rows = await rank.findAllByRole('button')
    expect(rows).toHaveLength(5)
    expect(rows[0].textContent).toContain(slugger.name)
    expect(rows[0].textContent).toContain('응원 14')
    expect(rows[1].textContent).toContain(ace.name)
    await user.click(rows[1])
    expect(await screen.findByRole('heading', { name: `${ace.name} 응원방` })).toBeTruthy()
  })

  it('커뮤니티 화면 옆에도 이번 주 응원 순위가 있다', async () => {
    renderAt('/community', createMemoryCheer({ seeds, user: ME }))
    const rank = within(await screen.findByLabelText('이번 주 응원 순위'))
    expect((await rank.findAllByRole('button'))[0].textContent).toContain(slugger.name)
  })
})

describe('응원 메시지 (커뮤니티와 같은 작성 제한)', () => {
  const type = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
    const box = await openWriteBox(user, '응원 메시지 내용')
    await user.clear(box)
    await user.type(box, text)
  }

  it('남기면 타임라인 맨 위에 닉네임으로 나오고, 저장 위치 안내가 보인다', async () => {
    const user = userEvent.setup()
    renderAt(room(), createMemoryCheer({ seeds, user: ME }))
    expect(await screen.findByText(/^시연용이라 응원이 이 브라우저에만 저장돼요/)).toBeTruthy()
    await type(user, '오늘도 화이팅!')
    await user.click(screen.getByRole('button', { name: '응원 남기기' }))
    const first = (await messages()).getAllByRole('article')[0]
    await waitFor(() => expect(first.textContent).toContain('오늘도 화이팅!'))
    expect(within(first).getByText('수달팬')).toBeTruthy()
    expect(within(first).getByRole('button', { name: '삭제' })).toBeTruthy()
  })

  it('심한 표현은 이유를 보여 주고 남길 수 없다', async () => {
    const user = userEvent.setup()
    renderAt(room(), createMemoryCheer({ user: ME }))
    await type(user, `${slugger.name} 얼굴부터 좆같이 생김`)
    expect(screen.getByText('이대로는 올릴 수 없어요.')).toBeTruthy()
    expect((screen.getByRole('button', { name: '응원 남기기' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('애매하면 물어보고, 그래도 올리면 「주의」 표시와 함께 걸린 표현을 가린다', async () => {
    const user = userEvent.setup()
    renderAt(room(), createMemoryCheer({ user: ME }))
    await type(user, '니 말이 맞다 씨발 오늘 대박')
    await user.click(screen.getByRole('button', { name: '응원 남기기' }))
    const dialog = within(await screen.findByRole('alertdialog', { name: '게시 전 확인' }))
    await user.click(dialog.getByRole('button', { name: '그래도 올리기' }))
    const card = (await messages()).getAllByRole('article')[0]
    await waitFor(() => expect(within(card).getByText('주의')).toBeTruthy())
    expect(card.textContent).not.toContain('씨발')
  })

  it('30초에 한 번만 남길 수 있다', async () => {
    const user = userEvent.setup()
    renderAt(room(), createMemoryCheer({ user: ME }))
    await type(user, '첫 응원')
    await user.click(screen.getByRole('button', { name: '응원 남기기' }))
    await screen.findByText('응원을 남겼어요.')
    await type(user, '두 번째 응원')
    await user.click(screen.getByRole('button', { name: '응원 남기기' }))
    expect(await screen.findByText(/^도배를 막기 위해 30초에 한 번만 응원 메시지를 올릴 수 있어요/)).toBeTruthy()
  })

  it('허용되는 거친 표현 예시는 「거친 표현 가리기」(기본 켜짐)에 따라 가려 보인다', async () => {
    renderAt(room(), createMemoryCheer({ seeds, user: ME }))
    const list = await messages()
    expect(await list.findByText(/어제 그 홈런 ●●/)).toBeTruthy()
    expect(list.getAllByText('일부 가림')).toHaveLength(1)
  })

  it('남의 메시지는 두 번 눌러 신고한다', async () => {
    const user = userEvent.setup()
    renderAt(room(), createMemoryCheer({ seeds, user: ME }))
    const card = within((await messages()).getAllByRole('article')[0])
    await user.click(card.getByRole('button', { name: '신고' }))
    await user.click(card.getByRole('button', { name: /^한 번 더 누르면 신고/ }))
    expect(await card.findByRole('button', { name: '신고함' })).toBeTruthy()
  })
})

describe('시연 첫 화면과 초기화 (앱이 여는 브라우저 저장소 그대로)', () => {
  it('처음 열어도 예시 응원이 보이고, 초기화하면 내 응원이 지워진다', async () => {
    const user = userEvent.setup()
    renderAt(room())
    const list = await messages()
    expect(await list.findAllByText('데모 응원')).toHaveLength(3)
    await user.click(await screen.findByRole('button', { name: '📣 응원하기' }))
    await screen.findByRole('button', { name: '오늘 응원했어요' })

    await user.click(screen.getByRole('button', { name: '시연 데이터 초기화' }))
    const confirm = within(screen.getByRole('alertdialog', { name: '초기화 확인' }))
    expect(confirm.getByText(/응원 메시지와 「응원하기」/)).toBeTruthy()
    await user.click(confirm.getByRole('button', { name: '초기화' }))
    expect(await screen.findByRole('button', { name: '📣 응원하기' })).toBeTruthy()
    expect(screen.getByLabelText('누적 응원 수').textContent).toBe(`${sluggerTotal} 누적 응원`)
  })
})
