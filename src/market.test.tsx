// @vitest-environment jsdom
// 화면 9~14. 굿즈 마켓: 공식 스토어(구단별), 팬 마켓(판매 규칙·경고), 판매글 쓰기, 장바구니·주문 확인(시연), 선수 카드·응원방 연동
import 'fake-indexeddb/auto'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { openFold } from './testing/folds'
import { IDBFactory } from 'fake-indexeddb'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { seedStars } from './data/seedPlayers'
import App from './App'
import { findEnabledButton } from './testing/buttons'
import { createMemoryCheer } from './data/cheer/memory'
import { createMemoryCommunity } from './data/community/memory'
import { createMemoryMarket } from './data/market/memory'
import { DEMO_SELLERS, demoMarketSeeds } from './data/market/seed'
import { getDataSource } from './data/registry'
import type { MarketRepository } from './data/source'
import CheerProvider from './ui/cheer/CheerProvider'
import CommunityProvider from './ui/community/CommunityProvider'
import MarketProvider from './ui/market/MarketProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

window.scrollTo = () => {}
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}

const ds = await getDataSource('demo').load()
const seeds = demoMarketSeeds(ds)
const slugger = seedStars(ds).sluggers[0]
const enc = encodeURIComponent
const TEAM = ds.hitters[0].team

/** 저장소를 넣지 않으면 앱이 여는 그대로 (registry → 브라우저 저장소 + 예시 데이터) */
function renderAt(path: string, market?: MarketRepository) {
  const mem = market !== undefined
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LeagueProvider>
        <CommunityProvider repository={mem ? createMemoryCommunity() : undefined}>
          <CheerProvider repository={mem ? createMemoryCheer() : undefined}>
            <MarketProvider repository={market}>
              <App />
            </MarketProvider>
          </CheerProvider>
        </CommunityProvider>
      </LeagueProvider>
    </MemoryRouter>,
  )
}
const seeded = () => createMemoryMarket({ seeds })

afterEach(cleanup)
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe('공식 스토어', () => {
  it('가상 구단 6개 × 6종 상품, 구단별로 골라 보기', async () => {
    const user = userEvent.setup()
    renderAt('/market', seeded())
    const list = within(await screen.findByLabelText('상품 목록'))
    expect(list.getAllByRole('article')).toHaveLength(36)
    const teams = within(screen.getByRole('group', { name: '구단 고르기' })).getAllByRole('button')
    expect(teams).toHaveLength(7) // 전체 + 6
    await user.click(screen.getByRole('button', { name: TEAM }))
    expect(within(screen.getByLabelText('상품 목록')).getAllByRole('article')).toHaveLength(6)
    expect(screen.getByRole('img', { name: `${TEAM} 홈 유니폼 그림` })).toBeTruthy()
  })

  it('담으면 장바구니 개수가 오른다', async () => {
    const user = userEvent.setup()
    renderAt('/market', seeded())
    await user.click(await findEnabledButton(`${TEAM} 모자 담기`))
    expect(await screen.findByRole('link', { name: '장바구니 1' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: `${TEAM} 모자 담기` }))
    expect(await screen.findByRole('link', { name: '장바구니 2' })).toBeTruthy()
  })

  it('상단 메뉴에 「마켓」이 있다', async () => {
    renderAt('/', seeded())
    expect(await screen.findByRole('link', { name: '마켓' })).toBeTruthy()
  })
})

describe('팬 마켓', () => {
  it('예시 판매글과 판매 규칙이 보이고, 경고가 있는 판매글에는 「주의」가 붙는다', async () => {
    renderAt('/market/fan', seeded())
    const list = within(await screen.findByLabelText('판매글 목록'))
    expect(list.getAllByRole('article')).toHaveLength(5)
    expect(list.getAllByText('주의')).toHaveLength(2) // 마킹 시연, 사기 경고 시연
    const rules = within(screen.getByLabelText('판매 규칙'))
    expect(rules.getByText('선수 사진이나 구단 로고를 넣어 직접 만든 비공식 상품은 팔 수 없어요.')).toBeTruthy()
    expect(rules.getByText('티켓·입장권 되팔기는 할 수 없어요.')).toBeTruthy()
  })

  it('사기 경고 시연 판매글: 사는 사람에게 세 가지 경고와 안내를 보여 준다', async () => {
    renderAt(`/market/fan/${seeds[1].id}`, seeded())
    const note = within(await screen.findByRole('note', { name: '주의' }))
    expect(note.getByText('유니폼 기준 시세(89,000원)보다 지나치게 싼 가격이에요')).toBeTruthy()
    expect(note.getByText('선입금을 요구하는 표현이 있어요(선입금)')).toBeTruthy()
    expect(note.getByText(/^외부 메신저 연락처가 있어요\(카톡/)).toBeTruthy()
    expect(note.getByText('선입금이나 외부 메신저 거래는 하지 말고, 앱 안에서 거래하세요.')).toBeTruthy()
  })

  it('마킹 판매글은 공식 마킹인지 확인하라고 알린다. 사진 없는 판매글은 상품 그림을 대신 보여 준다', async () => {
    renderAt(`/market/fan/${seeds[0].id}`, seeded())
    expect(await screen.findByText('「마킹」 상품이에요. 구단 공식 마킹인지 확인하세요')).toBeTruthy()
    expect(screen.getByText('사진 없음')).toBeTruthy()
  })

  it('선수로 걸러 보기 (?player=)', async () => {
    renderAt(`/market/fan?player=${enc(slugger.id)}`, seeded())
    const list = within(await screen.findByLabelText('판매글 목록'))
    expect(list.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByRole('button', { name: `${slugger.name} 관련 상품 ✕` })).toBeTruthy()
  })
})

describe('판매글 쓰기', () => {
  async function fill(user: ReturnType<typeof userEvent.setup>, title: string, price: string, text = '') {
    await user.type(await screen.findByRole('textbox', { name: '상품 이름' }), title)
    await user.type(screen.getByRole('textbox', { name: '가격(원)' }), price)
    if (text) await user.type(screen.getByRole('textbox', { name: '설명' }), text)
  }
  const post = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: '판매글 올리기' }))

  it('판매 규칙에 동의해야 올릴 수 있고, 올리면 판매글 화면으로 간다 (선수 이름은 자동 태그)', async () => {
    const user = userEvent.setup()
    renderAt('/market/sell', createMemoryMarket())
    await fill(user, `${slugger.name} 응원봉`, '20000')
    await user.selectOptions(screen.getByRole('combobox', { name: /^종류/ }), '응원봉') // 기본 종류(유니폼)면 시세보다 싸다는 경고가 뜬다
    await post(user)
    expect(await screen.findByText('판매 규칙을 읽고 동의해 주세요.')).toBeTruthy()
    await user.click(screen.getByRole('checkbox'))
    await post(user)
    expect(await screen.findByRole('heading', { name: `${slugger.name} 응원봉` })).toBeTruthy()
    expect(screen.getByText('20,000원')).toBeTruthy()
    expect((screen.getByRole('button', { name: '내 판매글이에요' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('button', { name: slugger.name })).toBeTruthy() // 선수 태그
  })

  it('티켓 되팔기·직접 제작 상품은 이유와 함께 막는다', async () => {
    const user = userEvent.setup()
    renderAt('/market/sell', createMemoryMarket())
    await fill(user, `${slugger.name} 직접 제작 쿠션`, '20000')
    await user.click(screen.getByRole('checkbox'))
    await post(user)
    expect(await screen.findByText('판매할 수 없는 상품이에요. 비공식 상품(직접제작). 공식 굿즈만 팔 수 있어요.')).toBeTruthy()
  })

  it('커스텀·마킹, 지나치게 싼 가격은 경고하고, 그래도 올리면 「주의」가 붙는다', async () => {
    const user = userEvent.setup()
    renderAt('/market/sell', createMemoryMarket())
    await fill(user, `${slugger.name} 커스텀 유니폼`, '20000')
    await user.click(screen.getByRole('checkbox'))
    await post(user)
    const dialog = within(await screen.findByRole('alertdialog', { name: '게시 전 확인' }))
    expect(dialog.getByText('유니폼 기준 시세(89,000원)보다 지나치게 싼 가격이에요')).toBeTruthy()
    expect(dialog.getByText('「커스텀」 상품이에요. 구단 공식 마킹인지 확인하세요')).toBeTruthy()
    await user.click(dialog.getByRole('button', { name: '그래도 올리기' }))
    expect(await screen.findByRole('note', { name: '주의' })).toBeTruthy()
  })

  it('선수 카드의 「이 선수 상품 팔기」는 선수 태그를 미리 단다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${enc(slugger.id)}`, seeded())
    const panel = within(await screen.findByLabelText('이 선수 관련 상품'))
    expect(await panel.findByText('2개')).toBeTruthy()
    await openFold(user, '이 선수 관련 상품', screen.getByLabelText('이 선수 관련 상품'))
    await user.click(panel.getByRole('button', { name: '이 선수 상품 팔기' }))
    expect(await screen.findByRole('button', { name: `${slugger.name} 태그 빼기` })).toBeTruthy()
  })
})

describe('장바구니와 주문 확인 (시연용)', () => {
  it('공식 스토어와 판매자별로 나눠 보여 주고, 주문하면 시연 주문 번호와 함께 장바구니를 비운다', async () => {
    const user = userEvent.setup()
    const market = seeded()
    const ace = seeds.find((s) => s.id === 'demo-listing-3')!
    await market.saveCart([
      { kind: 'store', productId: `store:${TEAM}:cap`, qty: 2 },
      { kind: 'listing', listingId: seeds[0].id },
      { kind: 'listing', listingId: ace.id },
    ])
    renderAt('/market/cart', market)
    expect(await screen.findByText('🧾 시연용이라 실제 결제는 일어나지 않아요')).toBeTruthy()
    const items = within(screen.getByLabelText('장바구니 상품'))
    expect(items.getAllByRole('listitem')).toHaveLength(3)
    await user.click(items.getByRole('button', { name: `${TEAM} 모자 하나 더` }))
    await waitFor(() => expect(items.getByLabelText(`${TEAM} 모자 수량`).textContent).toBe('3'))

    await user.click(screen.getByRole('button', { name: '주문 확인으로' }))
    expect(await screen.findByRole('heading', { name: '주문 확인' })).toBeTruthy()
    expect(screen.getByText('🧾 시연용이라 실제 결제는 일어나지 않아요')).toBeTruthy()
    const store = within(screen.getByLabelText('공식 스토어 주문'))
    expect(store.getByText(`${TEAM} 모자 × 3`)).toBeTruthy()
    expect(store.getByText('상품 105,000원 + 배송비 무료')).toBeTruthy()
    expect(within(screen.getByLabelText(`판매자 ${DEMO_SELLERS.otter.name} 주문`)).getByText('상품 62,000원 + 배송비 3,500원')).toBeTruthy()
    expect(screen.getByLabelText(`판매자 ${DEMO_SELLERS.goat.name} 주문`)).toBeTruthy()
    const total = 105_000 + 62_000 + 3_500 + 11_000 + 3_500

    await user.click(screen.getByRole('button', { name: `${total.toLocaleString('ko-KR')}원 주문하기 (시연)` }))
    const done = within(await screen.findByRole('status', { name: '주문 완료' }))
    expect(done.getByText(/^DEMO-\d{8}-\d{4}$/)).toBeTruthy()
    expect(done.getByText('시연용이라 실제 결제와 배송은 일어나지 않아요. 장바구니를 비웠어요.')).toBeTruthy()
    expect(screen.getByRole('link', { name: '장바구니 0' })).toBeTruthy()
  })

  it('저장소가 늦게 열려도 담기가 사라지지 않는다 (버튼은 저장소가 열린 뒤 활성)', async () => {
    const user = userEvent.setup()
    const repo = seeded()
    // 저장소가 300ms 늦게 열리는 기기 (바쁠 때를 흉내 낸다)
    const slow: MarketRepository = { ...repo, snapshot: () => new Promise((r) => setTimeout(() => r(repo.snapshot()), 300)) }
    renderAt('/market', slow)
    const button = await screen.findByRole('button', { name: `${TEAM} 모자 담기` })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    await user.click(await findEnabledButton(`${TEAM} 모자 담기`))
    expect(await screen.findByRole('link', { name: '장바구니 1' })).toBeTruthy()
  })

  it('판매글 화면에서 담으면 「장바구니에 있어요」로 바뀐다', async () => {
    const user = userEvent.setup()
    renderAt(`/market/fan/${seeds[0].id}`, seeded())
    await user.click(await screen.findByRole('button', { name: '장바구니에 담기' }))
    expect(await screen.findByRole('button', { name: '장바구니에 있어요' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '장바구니 1' })).toBeTruthy()
  })

  it('빈 장바구니 안내', async () => {
    renderAt('/market/cart', createMemoryMarket())
    expect(await screen.findByText(/^장바구니가 비었어요/)).toBeTruthy()
  })
})

describe('응원방 연동과 시연 데이터 (앱이 여는 브라우저 저장소 그대로)', () => {
  it('응원방에도 이 선수 관련 상품이 보이고, 초기화하면 장바구니가 비고 예시 판매글로 돌아간다', async () => {
    const user = userEvent.setup()
    renderAt(`/player/${enc(slugger.id)}/cheer`)
    const panel = within(await screen.findByLabelText('이 선수 관련 상품'))
    expect(await panel.findByText('2개')).toBeTruthy()
    await openFold(user, '이 선수 관련 상품', screen.getByLabelText('이 선수 관련 상품'))
    await user.click(panel.getAllByRole('button', { name: new RegExp(seeds[0].title.replace(/[()]/g, '\\$&')) })[0])
    await user.click(await screen.findByRole('button', { name: '장바구니에 담기' }))
    expect(await screen.findByRole('link', { name: '장바구니 1' })).toBeTruthy()

    await user.click(screen.getByRole('link', { name: '커뮤니티' }))
    await user.click(await screen.findByRole('button', { name: '시연 데이터 초기화' }))
    const confirm = within(screen.getByRole('alertdialog', { name: '초기화 확인' }))
    expect(confirm.getByText(/판매글과 장바구니/)).toBeTruthy()
    await user.click(confirm.getByRole('button', { name: '초기화' }))
    await screen.findByText(/^시연 데이터를 처음 상태로 되돌렸어요/)
    await user.click(screen.getByRole('link', { name: '마켓' }))
    expect(await screen.findByRole('link', { name: '장바구니 0' })).toBeTruthy()
  })
})
