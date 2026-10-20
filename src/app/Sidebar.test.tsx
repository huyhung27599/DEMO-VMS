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

describe('Sidebar grouped nav', () => {
  it('hiển thị đủ 5 nhóm SRS', async () => {
    const onLogout = vi.fn()
    renderWithProviders(<Sidebar active="dashboard" onLogoutClick={onLogout} />, { route: '/dashboard' })
    await waitFor(() => expect(screen.getByLabelText('Điều hướng chính')).toBeInTheDocument())
    for (const g of NAV_GROUPS) {
      expect(screen.getByRole('button', { name: new RegExp(g.label, 'i') })).toBeInTheDocument()
    }
  })

  it('click stub route điều hướng tới path mới', async () => {
    const onLogout = vi.fn()
    const { router } = renderWithProviders(<Sidebar active="dashboard" onLogoutClick={onLogout} />, {
      route: '/dashboard',
    })
    await waitFor(() => expect(screen.getByLabelText('Điều hướng chính')).toBeInTheDocument())
    const reportsToggle = screen.getByRole('button', { name: /Báo cáo/i })
    if (reportsToggle.getAttribute('aria-expanded') === 'false') {
      fireEvent.click(reportsToggle)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo hành trình' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/reports-trips'))
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
    renderWithProviders(<PlaceholderSection routeId="reports-trips" hidden={false} />)
    expect(
      await screen.findByRole('heading', { name: PLACEHOLDER_PAGES['reports-trips']!.title }),
    ).toBeInTheDocument()
    expect(screen.getByText('Đang phát triển')).toBeInTheDocument()
    expect(screen.getByText(PLACEHOLDER_PAGES['reports-trips']!.description)).toBeInTheDocument()
  })
})
