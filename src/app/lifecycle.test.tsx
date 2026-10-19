import { act, waitFor } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { renderApp, renderWithProviders, type AppResult } from '../test/renderWithProviders'
import { expectPolling } from '../test/expectPolling'
import { authActions, useAuthStore } from '../shared/auth/authStore'
import { api } from '../shared/api/endpoints'
import { playbackInit } from '../features/playback/init'
import { useModuleEnabled } from './useModuleEnabled'

vi.mock('../features/playback/init', () => ({ playbackInit: vi.fn() }))
vi.mock('../shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../shared/api/client')>()),
  refreshCsrfToken: vi.fn(async () => 'csrf'),
  clearSecurityContext: vi.fn(),
}))

let app: AppResult | null = null

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  useAuthStore.setState({ view: 'login', username: '', logoutReason: '', hasShownApp: false })
  vi.spyOn(api, 'login').mockResolvedValue({ result: 0, jsession: 'tok', account_name: 'admin' })
  vi.spyOn(api, 'logout').mockResolvedValue({ result: 0 })
})

afterEach(() => {
  app?.history.destroy()
  app = null
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('vòng đời đăng nhập / đăng xuất', () => {
  it('đăng nhập -> đăng xuất -> đăng nhập: hasShownApp luôn true, điều hướng và init đúng', async () => {
    app = renderApp({ hash: '#vehicle' })
    await waitFor(() => expect(window.location.hash).toBe('#login'))
    expect(playbackInit).not.toHaveBeenCalled()
    const refetch = vi.spyOn(app.queryClient, 'refetchQueries')
    const addListener = vi.spyOn(window, 'addEventListener')

    await act(async () => {
      await authActions.login('admin', 'pw', false)
    })
    expect(useAuthStore.getState().hasShownApp).toBe(true)
    await waitFor(() => expect(window.location.hash).toBe('#dashboard'))
    expect(playbackInit).toHaveBeenCalled()
    expect(refetch).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
    const mousemoveCount = () => addListener.mock.calls.filter((c) => c[0] === 'mousemove').length
    expect(mousemoveCount()).toBe(1)

    const lenBeforeLogout = window.history.length
    await act(async () => {
      await authActions.logout('Lý do')
    })
    expect(useAuthStore.getState().hasShownApp).toBe(true)
    await waitFor(() => expect(window.location.hash).toBe('#login'))
    expect(window.history.length).toBe(lenBeforeLogout)

    await act(async () => {
      await authActions.login('admin', 'pw', false)
    })
    await waitFor(() => expect(window.location.hash).toBe('#dashboard'))
    expect(useAuthStore.getState().hasShownApp).toBe(true)
    expect(mousemoveCount()).toBe(2)
    expect(refetch.mock.calls.filter((c) => JSON.stringify(c[0]) === '{"queryKey":["dashboard"]}')).toHaveLength(2)
  })

  it('tải trang khi đã đăng nhập: gắn activity listener một lần (StrictMode), gọi playbackInit', async () => {
    sessionStorage.setItem('dashcam_auth_token', 'tok')
    sessionStorage.setItem('dashcam_auth_user', 'admin')
    const addListener = vi.spyOn(window, 'addEventListener')
    app = renderApp({ hash: '#map', strict: true })
    await waitFor(() => expect(useAuthStore.getState().view).toBe('app'))
    await waitFor(() => expect(playbackInit).toHaveBeenCalledTimes(1))
    expect(addListener.mock.calls.filter((c) => c[0] === 'mousemove')).toHaveLength(1)
    expect(window.location.hash).toBe('#map')
  })

  it('tải trang khi chưa đăng nhập: không gọi playbackInit', async () => {
    app = renderApp({ hash: '' })
    await waitFor(() => expect(window.location.hash).toBe('#login'))
    expect(playbackInit).not.toHaveBeenCalled()
  })
})

const probeFn = vi.fn(async () => 'ok')

function VehicleProbe() {
  const enabled = useModuleEnabled('vehicle')
  useQuery({
    queryKey: ['vehicle', 'probe'],
    queryFn: probeFn,
    enabled,
    refetchInterval: 1000,
    // không đặt refetchIntervalInBackground: expectPolling chứng minh default của QueryClient
  })
  return null
}

function DashboardProbe() {
  return useModuleEnabled('dashboard') ? <span>dash-enabled</span> : <span>dash-disabled</span>
}

describe('useModuleEnabled + polling', () => {
  it('chưa chạy trước lần đăng nhập đầu, vẫn chạy sau khi đăng xuất, không nhân đôi trong StrictMode', async () => {
    vi.useFakeTimers()
    renderWithProviders(<VehicleProbe />, { strict: true })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(probeFn).not.toHaveBeenCalled()

    act(() => authActions.showApp('admin'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(probeFn).toHaveBeenCalledTimes(1)
    await expectPolling(probeFn, 1000)

    act(() => authActions.showLogin(''))
    await expectPolling(probeFn, 1000)
  })

  it('dashboard/driver/playback bật ngay từ lúc tải trang', async () => {
    const r = renderWithProviders(<DashboardProbe />)
    expect(await r.findByText('dash-enabled')).toBeInTheDocument()
  })
})
