import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { expectPolling } from '../../test/expectPolling'
import { renderWithProviders } from '../../test/renderWithProviders'
import { notifySectionShown } from '../../app/useActiveSection'

vi.mock('./loaders', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./loaders')>()),
  refresh: vi.fn(async () => {}),
  pollRealtimeAlarms: vi.fn(async () => {}),
}))

import { dashboardCharts } from './chartsController'
import { pollRealtimeAlarms, refresh } from './loaders'
import { dashboardKeys } from './queries'
import { DashboardSection } from './DashboardSection'
import { resetDashboardInit } from './init'
import { authActions, useAuthStore } from '../../shared/auth/authStore'

// Router của renderWithProviders load bất đồng bộ; fake timer của vitest không tự chạy findBy*
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50)
  })
}

describe('DashboardSection (chưa đăng nhập)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    resetDashboardInit()
    useAuthStore.setState({ view: 'login', hasShownApp: false })
    vi.useFakeTimers()
    vi.mocked(refresh).mockClear()
    vi.mocked(pollRealtimeAlarms).mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('hiển thị tiêu đề và trạng thái chờ ban đầu', async () => {
    renderWithProviders(<DashboardSection hidden={false} />)
    await settle()
    expect(screen.getByText('Trung tâm điều khiển')).toBeInTheDocument()
    expect(screen.getByText('Đang tải dữ liệu...', { selector: '#dashboard-last-updated' })).toBeInTheDocument()
  })

  it('không nạp dữ liệu lúc mount khi chưa đăng nhập (bản gốc chờ auth-success)', async () => {
    renderWithProviders(<DashboardSection hidden={false} />)
    await settle()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(refresh).not.toHaveBeenCalled()
    expect(pollRealtimeAlarms).not.toHaveBeenCalled()
  })

  it('refresh poll mỗi 120.000 ms kể cả khi tab ẩn', async () => {
    renderWithProviders(<DashboardSection hidden={false} />)
    await settle()
    expect(screen.getByText('Trung tâm điều khiển')).toBeInTheDocument()
    await expectPolling(vi.mocked(refresh), 120_000)
  })

  it('pollRealtimeAlarms poll mỗi 60.000 ms kể cả khi tab ẩn', async () => {
    renderWithProviders(<DashboardSection hidden={false} />)
    await settle()
    expect(screen.getByText('Trung tâm điều khiển')).toBeInTheDocument()
    await expectPolling(vi.mocked(pollRealtimeAlarms), 60_000)
  })

  it('StrictMode không nhân đôi polling', async () => {
    renderWithProviders(<DashboardSection hidden={false} />, { strict: true })
    await settle()
    expect(screen.getByText('Trung tâm điều khiển')).toBeInTheDocument()
    await expectPolling(vi.mocked(refresh), 120_000)
  })

  it('onSectionShown("dashboard") resize các biểu đồ', async () => {
    const resize = vi.spyOn(dashboardCharts, 'resize')
    renderWithProviders(<DashboardSection hidden={false} />)
    await settle()
    expect(screen.getByText('Trung tâm điều khiển')).toBeInTheDocument()
    notifySectionShown('dashboard')
    expect(resize).toHaveBeenCalled()
  })

  it('đã đăng nhập khi tải trang: refresh() chạy ngay lúc mount, một lần kể cả StrictMode', async () => {
    sessionStorage.setItem('dashcam_auth_token', 'tok')
    renderWithProviders(<DashboardSection hidden={false} />, { strict: true })
    await settle()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('đã đăng nhập khi tải trang: cộng loadDashboardData của showApp = hai lần refresh', async () => {
    sessionStorage.setItem('dashcam_auth_token', 'tok')
    const r = renderWithProviders(<DashboardSection hidden={false} />)
    await settle()
    await act(async () => {
      await r.queryClient.refetchQueries({ queryKey: dashboardKeys.refresh })
    })
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('đăng nhập lần đầu khi tải trang lúc chưa đăng nhập: auth-success + loadDashboardData = hai lần refresh, hook chỉ một lần', async () => {
    const r = renderWithProviders(<DashboardSection hidden={false} />)
    await settle()
    expect(refresh).not.toHaveBeenCalled()

    act(() => authActions.showApp('admin'))
    expect(refresh).toHaveBeenCalledTimes(1) // listener auth-success
    await act(async () => {
      await r.queryClient.refetchQueries({ queryKey: dashboardKeys.refresh }) // RootLayout
    })
    expect(refresh).toHaveBeenCalledTimes(2)

    // đăng xuất rồi đăng nhập lại: listener { once: true } không chạy nữa
    act(() => authActions.showLogin(''))
    act(() => authActions.showApp('admin'))
    expect(refresh).toHaveBeenCalledTimes(2)
  })
})
