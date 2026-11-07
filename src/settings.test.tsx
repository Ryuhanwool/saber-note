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
    expect(panel.getAllByRole('radio')).toHaveLength(11)
    expect((panel.getByRole('radio', { name: '기본' }) as HTMLInputElement).checked).toBe(true)
    expect(panel.getByRole('radio', { name: '남색·금색' })).toBeTruthy()
  })

  it('테마를 고르면 강조색과 배경 층이 바뀌고 저장된다. 기본으로 돌리면 원래대로', async () => {
    const user = userEvent.setup()
    const store = createMemorySettings({ decorations: false })
    renderApp(store)
    const panel = await openPanel(user)
    const navyGold = THEMES.find((t) => t.id === 'navy-gold')!
    await user.click(panel.getByRole('radio', { name: '남색·금색' }))
    expect(root.style.getPropertyValue('--team-accent-light')).toBe(navyGold.accent.light)
    expect(root.style.getPropertyValue('--team-accent-dark')).toBe(navyGold.accent.dark)
    expect(root.dataset.bg).toBe('on')
    expect(screen.getByTestId('app-bg').querySelector('.app-bg-base')!.getAttribute('data-kind')).toBe('theme')
    expect((await store.load()).themeId).toBe('navy-gold')

    await user.click(panel.getByRole('radio', { name: '기본' }))
    expect(root.style.getPropertyValue('--team-accent-light')).toBe('')
    expect(root.dataset.bg).toBe('off')
    expect(screen.queryByTestId('app-bg')).toBeNull()
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
    expect(await store.loadBackground()).not.toBeNull()

    await user.click(panel.getByRole('button', { name: '기본 배경으로' }))
    expect(await panel.findByText('기본 배경으로 되돌렸어요.')).toBeTruthy()
    expect(await store.loadBackground()).toBeNull()
    expect((await store.load()).themeId).toBe('default')
    expect(screen.queryByTestId('app-bg')).toBeNull()
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
