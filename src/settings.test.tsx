// @vitest-environment jsdom
// 응원 팀 배경: 화면 설정 버튼·창, 테마 강조색, 내 이미지 배경, 반투명 막
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IDBFactory } from 'fake-indexeddb'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { createMemoryCommunity } from './data/community/memory'
import { createBrowserSettings } from './data/settings/browser'
import { createMemorySettings } from './data/settings/memory'
import type { SettingsStore } from './data/source'
import { THEMES } from './domain/theme/themes'
import { themeBackground } from './domain/theme/surface'
import CommunityProvider from './ui/community/CommunityProvider'
import SettingsProvider from './ui/settings/SettingsProvider'
import LeagueProvider from './ui/shared/LeagueProvider'

window.scrollTo = () => {}
URL.createObjectURL = () => 'blob:test-bg'
URL.revokeObjectURL = () => {}

function renderApp(store: SettingsStore = createMemorySettings({ decorations: false })) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <SettingsProvider store={store}>
        <LeagueProvider>
          <CommunityProvider repository={createMemoryCommunity()}>
            <App />
          </CommunityProvider>
        </LeagueProvider>
      </SettingsProvider>
    </MemoryRouter>,
  )
}

const root = document.documentElement
const openPanel = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: '화면 설정' }))
  return within(screen.getByRole('dialog', { name: '화면 설정' }))
}

afterEach(cleanup)

describe('화면 설정: 팀 컬러 테마', () => {
  it('상단 메뉴 옆 버튼으로 창을 열고, 기본 + 색 이름 테마 10개를 고를 수 있다', async () => {
    const user = userEvent.setup()
    renderApp()
    const panel = await openPanel(user)
    expect(within(panel.getByRole('group', { name: '팀 컬러 테마' })).getAllByRole('radio')).toHaveLength(11)
    expect((panel.getByRole('radio', { name: '기본' }) as HTMLInputElement).checked).toBe(true)
    expect(panel.getByRole('radio', { name: '남색·금색' })).toBeTruthy()
  })

  it('테마를 고르면 강조색과 연한 테마 배경색이 바뀌고 저장된다 (막 없음). 기본으로 돌리면 중립 단색', async () => {
    const user = userEvent.setup()
    const store = createMemorySettings({ decorations: false })
    renderApp(store)
    const panel = await openPanel(user)
    const navyGold = THEMES.find((t) => t.id === 'navy-gold')!
    await user.click(panel.getByRole('radio', { name: '남색·금색' }))
    expect(root.style.getPropertyValue('--team-accent-light')).toBe(navyGold.accent.light)
    expect(root.style.getPropertyValue('--team-accent-dark')).toBe(navyGold.accent.dark)
    const bg = themeBackground(navyGold, 'medium')! // 배경 진하기 기본값은 보통
    expect(root.style.getPropertyValue('--team-bg-light-top')).toBe(bg.light.top)
    expect(root.style.getPropertyValue('--team-bg-light-bottom')).toBe(bg.light.bottom)
    expect(root.style.getPropertyValue('--team-bg-dark-top')).toBe(bg.dark.top)
    expect(root.style.getPropertyValue('--team-bg-dark-bottom')).toBe(bg.dark.bottom)
    expect(root.style.getPropertyValue('--team-bg-light-bar')).toBe(bg.light.bar) // 상단 메뉴 바에도 팀 색
    expect(root.style.getPropertyValue('--team-bg-dark-bar')).toBe(bg.dark.bar)
    expect(root.dataset.bg).toBe('on') // 보조 글자색을 배경용으로 (반투명 막은 깔지 않는다)
    expect(screen.queryByTestId('app-bg-overlay')).toBeNull()
    expect(screen.getByTestId('app-bg').querySelector('.app-bg-base')!.getAttribute('data-kind')).toBe('theme')
    expect((await store.load()).themeId).toBe('navy-gold')

    await user.click(panel.getByRole('radio', { name: '기본' }))
    expect(root.style.getPropertyValue('--team-accent-light')).toBe('')
    expect(root.style.getPropertyValue('--team-bg-light-top')).toBe('')
    expect(root.dataset.bg).toBe('off')
    expect(screen.getByTestId('app-bg').querySelector('.app-bg-base')!.getAttribute('data-kind')).toBe('plain')
  })

  it('배경 진하기: 연하게·보통·진하게 중 기본은 보통, 바꾸면 배경색이 바뀌고 저장된다', async () => {
    const user = userEvent.setup()
    const store = createMemorySettings({ decorations: false, themeId: 'navy-gold' })
    renderApp(store)
    const panel = await openPanel(user)
    const group = within(panel.getByRole('radiogroup', { name: '배경 진하기' }))
    expect(group.getAllByRole('radio').map((r) => r.parentElement!.textContent)).toEqual(['연하게', '보통', '진하게'])
    expect((group.getByRole('radio', { name: '보통' }) as HTMLInputElement).checked).toBe(true)
    const navyGold = THEMES.find((t) => t.id === 'navy-gold')!
    expect(root.style.getPropertyValue('--team-bg-light-top')).toBe(themeBackground(navyGold, 'medium')!.light.top)
    await user.click(group.getByRole('radio', { name: '진하게' }))
    expect(root.style.getPropertyValue('--team-bg-light-top')).toBe(themeBackground(navyGold, 'strong')!.light.top)
    expect(root.style.getPropertyValue('--team-bg-dark-top')).toBe(themeBackground(navyGold, 'strong')!.dark.top)
    expect((await store.load()).bgStrength).toBe('strong')
    await user.click(group.getByRole('radio', { name: '연하게' }))
    expect(root.style.getPropertyValue('--team-bg-light-top')).toBe(themeBackground(navyGold, 'soft')!.light.top)
    expect((await store.load()).bgStrength).toBe('soft')
  })

  it('Esc를 누르면 창이 닫힌다', async () => {
    const user = userEvent.setup()
    renderApp()
    await openPanel(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '화면 설정' })).toBeNull()
  })
})

describe('화면 설정: 내 이미지 배경', () => {
  it('사진을 고르면 배경이 되고, 맞지 않는 파일은 이유를 알려 준다. 기본 배경으로 되돌린다', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const store = createMemorySettings({ decorations: false, themeId: 'orange-black' })
    renderApp(store)
    const panel = await openPanel(user)
    const input = panel.getByText('사진 고르기').querySelector('input')!

    await user.upload(input, new File(['gif'], 'a.gif', { type: 'image/gif' }))
    expect(panel.getByRole('status').textContent).toContain('PNG, JPG, WEBP 사진만')

    await user.upload(input, new File(['jpg'], 'me.jpg', { type: 'image/jpeg' }))
    expect(await panel.findByText('내 사진을 배경으로 바꿨어요.')).toBeTruthy()
    const base = screen.getByTestId('app-bg').querySelector('.app-bg-base') as HTMLElement
    expect(base.dataset.kind).toBe('image')
    expect(base.style.backgroundImage).toContain('blob:test-bg')
    expect(screen.getByTestId('app-bg-overlay')).toBeTruthy() // 사진 위에는 막을 깐다
    expect(root.dataset.bg).toBe('on')
    expect(await store.loadBackground()).not.toBeNull()

    await user.click(panel.getByRole('button', { name: '기본 배경으로' }))
    expect(await panel.findByText('기본 배경으로 되돌렸어요.')).toBeTruthy()
    expect(await store.loadBackground()).toBeNull()
    expect((await store.load()).themeId).toBe('default')
    expect(screen.getByTestId('app-bg').querySelector('.app-bg-base')!.getAttribute('data-kind')).toBe('plain')
    expect(screen.queryByTestId('app-bg-overlay')).toBeNull()
  })

  it('메모리 저장소면 새로고침하면 사라진다고 알린다', async () => {
    const user = userEvent.setup()
    renderApp()
    const panel = await openPanel(user)
    expect(panel.getByText(/새로고침하면 처음으로 돌아가요/)).toBeTruthy()
  })

  it('브라우저 저장소: 테마와 배경 사진이 새로고침 뒤에도 남는다', async () => {
    const user = userEvent.setup()
    const indexedDB = new IDBFactory()
    const storage = window.localStorage
    storage.clear()
    const view = renderApp(createBrowserSettings({ indexedDB, storage }))
    const panel = await openPanel(user)
    await user.click(panel.getByRole('radio', { name: '파랑·흰색' }))
    await user.upload(panel.getByText('사진 고르기').querySelector('input')!, new File(['png'], 'me.png', { type: 'image/png' }))
    await panel.findByText('내 사진을 배경으로 바꿨어요.')
    view.unmount()

    renderApp(createBrowserSettings({ indexedDB, storage }))
    const again = await openPanel(user)
    expect((again.getByRole('radio', { name: '파랑·흰색' }) as HTMLInputElement).checked).toBe(true)
    expect(await again.findByRole('img', { name: '지금 배경 사진' })).toBeTruthy()
    expect(root.style.getPropertyValue('--team-accent-light')).toBe(THEMES.find((t) => t.id === 'blue-white')!.accent.light)
  })
})

describe('화면 설정: 배경 장식', () => {
  it('기본값은 꺼짐: 무늬도 반투명 막도 없이 중립 단색 배경', async () => {
    renderApp(createMemorySettings())
    const layer = await screen.findByTestId('app-bg')
    expect([...layer.children].map((el) => el.className)).toEqual(['app-bg-base'])
    expect(root.dataset.bg).toBe('off')
  })

  it('화면 설정에서 켜면 막 아래에 무늬가 깔리고, 다시 끌 수 있다. 설정이 저장된다', async () => {
    const user = userEvent.setup()
    const store = createMemorySettings()
    renderApp(store)
    const panel = await openPanel(user)
    const toggle = panel.getByRole('checkbox', { name: /야구공·배트·글러브·베이스·별/ })
    expect((toggle as HTMLInputElement).checked).toBe(false)
    await user.click(toggle)
    const layer = screen.getByTestId('app-bg')
    expect([...layer.children].map((el) => el.className)).toEqual(['app-bg-base', 'app-bg-deco', 'app-bg-overlay']) // 장식은 반투명 막 아래
    expect((screen.getByTestId('app-bg-deco') as HTMLElement).style.maskImage).toContain('data:image/svg+xml')
    expect(root.dataset.bg).toBe('on')
    expect((await store.load()).decorations).toBe(true)
    await user.click(toggle)
    expect(screen.queryByTestId('app-bg-deco')).toBeNull()
    expect(screen.queryByTestId('app-bg-overlay')).toBeNull()
    expect((await store.load()).decorations).toBe(false)
  })
})

