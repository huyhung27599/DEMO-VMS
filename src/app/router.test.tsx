import { waitFor } from '@testing-library/react'
import { renderApp, type AppResult } from '../test/renderWithProviders'
import { useAuthStore } from '../shared/auth/authStore'

vi.mock('../features/playback/init', () => ({ playbackInit: vi.fn() }))

let app: AppResult | null = null

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  useAuthStore.setState({ view: 'login', username: '', logoutReason: '', hasShownApp: false })
})

afterEach(() => {
  app?.history.destroy()
  app = null
})

function loginStorage() {
  sessionStorage.setItem('dashcam_auth_token', 'tok')
  sessionStorage.setItem('dashcam_auth_user', 'admin')
}

describe('router guard (chưa đăng nhập)', () => {
  it.each(['#vehicle', '', '#xyz', '#/dashboard', '#DRIVER'])(
    "hash '%s' -> '#login' bằng replace (history.length không đổi)",
    async (hash) => {
      window.history.replaceState(null, '', '/' + hash)
      const before = window.history.length
      app = renderApp({ hash })
      await waitFor(() => expect(window.location.hash).toBe('#login'))
      await waitFor(() => expect(document.getElementById('login-form')).toBeInTheDocument())
      expect(window.history.length).toBe(before)
      expect(useAuthStore.getState().view).toBe('login')
    },
  )
})

describe('router guard (đã đăng nhập)', () => {
  it.each(['', '#xyz', '#/dashboard', '#login'])("hash '%s' -> '#dashboard'", async (hash) => {
    loginStorage()
    app = renderApp({ hash })
    await waitFor(() => expect(window.location.hash).toBe('#dashboard'))
    await waitFor(() => expect(document.getElementById('dashboard-section')).not.toHaveAttribute('hidden'))
    expect(useAuthStore.getState().view).toBe('app')
  })

  it("'#DRIVER' -> section driver hiển thị (không phân biệt hoa thường)", async () => {
    loginStorage()
    app = renderApp({ hash: '#DRIVER' })
    await waitFor(() => expect(document.getElementById('driver-section')).not.toHaveAttribute('hidden'))
    expect(document.getElementById('dashboard-section')).toHaveAttribute('hidden')
    expect(window.location.hash).toBe('#DRIVER')
  })

  it('token hết hạn giữa phiên: điều hướng -> #login và hiện màn đăng nhập', async () => {
    loginStorage()
    app = renderApp({ hash: '#vehicle' })
    await waitFor(() => expect(useAuthStore.getState().view).toBe('app'))
    sessionStorage.clear()
    window.location.hash = '#map'
    await waitFor(() => expect(window.location.hash).toBe('#login'))
    await waitFor(() => expect(useAuthStore.getState().view).toBe('login'))
  })
})
