import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderApp, type AppResult } from '../test/renderWithProviders'
import { useAuthStore } from '../shared/auth/authStore'
import { onSectionShown } from './useActiveSection'

vi.mock('../features/playback/init', () => ({ playbackInit: vi.fn() }))

const SECTION_IDS = [
  'dashboard',
  'liveview',
  'playback',
  'statistics',
  'map',
  'driver',
  'vehicle',
  'event-server',
  'settings',
]

let app: AppResult | null = null

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  sessionStorage.setItem('dashcam_auth_token', 'tok')
  sessionStorage.setItem('dashcam_auth_user', 'admin')
  useAuthStore.setState({ view: 'login', username: '', logoutReason: '', hasShownApp: false })
})

afterEach(() => {
  app?.history.destroy()
  app = null
})

describe('AppShell', () => {
  it('#vehicle: chỉ section vehicle không có hidden, các section khác vẫn trong DOM', async () => {
    app = renderApp({ hash: '#vehicle' })
    await waitFor(() => expect(document.getElementById('vehicle-section')).not.toHaveAttribute('hidden'))
    for (const id of SECTION_IDS) {
      const el = document.getElementById(`${id}-section`)
      expect(el).toBeInTheDocument()
      if (id !== 'vehicle') expect(el).toHaveAttribute('hidden')
    }
  })

  it('nav item vehicle có aria-current="page" và class active', async () => {
    app = renderApp({ hash: '#vehicle' })
    const nav = await screen.findByRole('button', { name: /Quản lý phương tiện/ })
    await waitFor(() => expect(nav).toHaveAttribute('aria-current', 'page'))
    const dash = screen.getByRole('button', { name: /Trung tâm điều khiển/ })
    expect(dash).not.toHaveAttribute('aria-current')
  })

  it("click nav 'map' -> '#map' (push) và gọi callback onSectionShown('map')", async () => {
    const cb = vi.fn()
    const off = onSectionShown('map', cb)
    const other = vi.fn()
    const offOther = onSectionShown('driver', other)
    try {
      app = renderApp({ hash: '#vehicle' })
      const nav = await screen.findByRole('button', { name: /Bản đồ trực tuyến/ })
      const before = window.history.length
      fireEvent.click(nav)
      await waitFor(() => expect(window.location.hash).toBe('#map'))
      expect(window.history.length).toBe(before + 1)
      await waitFor(() => expect(cb).toHaveBeenCalledTimes(1))
      expect(document.getElementById('map-section')).not.toHaveAttribute('hidden')
      expect(other).not.toHaveBeenCalled()
    } finally {
      off()
      offOther()
    }
  })

  it('hiển thị username đúng nguyên chuỗi (textContent)', async () => {
    sessionStorage.setItem('dashcam_auth_user', 'a&amp;b')
    app = renderApp({ hash: '#dashboard' })
    await waitFor(() => expect(document.getElementById('user-info')).toHaveTextContent('a&amp;b'))
  })

  it('Cài đặt: nút "Thay đổi mật khẩu ngay" mở modal đổi mật khẩu', async () => {
    app = renderApp({ hash: '#settings' })
    const btn = await screen.findByRole('button', { name: /Thay đổi mật khẩu ngay/ })
    expect(document.getElementById('change-password-modal')).toHaveAttribute('aria-hidden', 'true')
    fireEvent.click(btn)
    expect(document.getElementById('change-password-modal')).toHaveAttribute('aria-hidden', 'false')
    expect(screen.getByRole('button', { name: 'Sắp ra mắt' })).toBeDisabled()
  })

  it('nút Đăng xuất ở sidebar mở modal xác nhận', async () => {
    app = renderApp({ hash: '#dashboard' })
    await waitFor(() => expect(document.getElementById('logout-btn')).toBeInTheDocument())
    expect(document.getElementById('logout-confirm-modal')).toHaveAttribute('aria-hidden', 'true')
    fireEvent.click(document.getElementById('logout-btn')!)
    expect(document.getElementById('logout-confirm-modal')).toHaveAttribute('aria-hidden', 'false')
  })

  it("sidebar mouseenter/mouseleave -> callback 'map' sau 220 ms; transitionend(width) -> ngay", async () => {
    app = renderApp({ hash: '#dashboard' })
    await waitFor(() => expect(useAuthStore.getState().view).toBe('app'))
    const aside = document.querySelector('aside') as HTMLElement
    const cb = vi.fn()
    const off = onSectionShown('map', cb)
    try {
      vi.useFakeTimers()
      fireEvent.mouseEnter(aside)
      vi.advanceTimersByTime(219)
      expect(cb).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(cb).toHaveBeenCalledTimes(1)
      fireEvent.mouseLeave(aside)
      vi.advanceTimersByTime(220)
      expect(cb).toHaveBeenCalledTimes(2)
      const ev = new Event('transitionend', { bubbles: true }) as Event & { propertyName?: string }
      Object.defineProperty(ev, 'propertyName', { value: 'width' })
      aside.dispatchEvent(ev)
      expect(cb).toHaveBeenCalledTimes(3)
    } finally {
      vi.useRealTimers()
      off()
    }
  })
})
