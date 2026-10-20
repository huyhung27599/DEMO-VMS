import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import { useAuthStore } from '../shared/auth/authStore'
import { NAV_GROUPS, PLACEHOLDER_PAGES } from './navConfig'
import { PlaceholderSection } from './PlaceholderSection'
import { Sidebar } from './Sidebar'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  useAuthStore.setState({ view: 'app', username: 'admin', logoutReason: '', hasShownApp: true })
})

describe('Sidebar mock IA', () => {
  it('hiển thị đúng 3 nhóm Tổng quan / Vận hành / Quản trị', async () => {
    const onLogout = vi.fn()
    renderWithProviders(<Sidebar active="dashboard" onLogoutClick={onLogout} />, { route: '/dashboard' })
    await waitFor(() => expect(screen.getByLabelText('Điều hướng chính')).toBeInTheDocument())
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(['Tổng quan', 'Vận hành', 'Quản trị'])
    for (const g of NAV_GROUPS) {
      expect(screen.getByText(g.label)).toBeInTheDocument()
    }
    expect(screen.getByText('Dashcam VMS')).toBeInTheDocument()
  })

  it('Báo cáo đi tới statistics (trang có dữ liệu)', async () => {
    const onLogout = vi.fn()
    const { router } = renderWithProviders(<Sidebar active="dashboard" onLogoutClick={onLogout} />, {
      route: '/dashboard',
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Báo cáo' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/statistics'))
  })

  it('active users dùng pill đỏ nhạt', async () => {
    const onLogout = vi.fn()
    renderWithProviders(<Sidebar active="users" onLogoutClick={onLogout} />, { route: '/users' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Quản lý người dùng' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Quản lý người dùng' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Quản lý người dùng' }).className).toMatch(/bg-\[#fce8eb\]/)
  })

  it('Đăng xuất gọi onLogoutClick', async () => {
    const onLogout = vi.fn()
    renderWithProviders(<Sidebar active="dashboard" onLogoutClick={onLogout} />, { route: '/dashboard' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    expect(onLogout).toHaveBeenCalled()
  })
})

describe('PlaceholderSection', () => {
  it('hiển thị title + badge Đang phát triển', async () => {
    renderWithProviders(<PlaceholderSection routeId="enterprises" hidden={false} />)
    expect(await screen.findByRole('heading', { name: PLACEHOLDER_PAGES.enterprises!.title })).toBeInTheDocument()
    expect(screen.getByText('Đang phát triển')).toBeInTheDocument()
  })
})
