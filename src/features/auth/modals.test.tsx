import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { authActions, useAuthStore } from '../../shared/auth/authStore'
import { api } from '../../shared/api/endpoints'
import { refreshCsrfToken } from '../../shared/api/client'
import { ToastContainer } from '../../shared/ui/ToastContainer'
import { useToastStore } from '../../shared/ui/toastStore'
import { ChangePasswordModal } from './ChangePasswordModal'
import { ForgotPasswordModal } from './ForgotPasswordModal'
import { ResetPasswordModal } from './ResetPasswordModal'
import { ResetRequestModal } from './ResetRequestModal'
import { LogoutConfirmModal } from '../../app/LogoutConfirmModal'
import { openChangePasswordModal, useChangePasswordModalStore } from './store'

vi.mock('../../shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../shared/api/client')>()),
  refreshCsrfToken: vi.fn(async () => 'csrf'),
  clearSecurityContext: vi.fn(),
}))

const STRONG = 'Abcdefgh123!'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  useAuthStore.setState({ view: 'app', username: 'admin', logoutReason: '', hasShownApp: true })
  useChangePasswordModalStore.setState({ open: false })
  useToastStore.setState({ toasts: [] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function fill(id: string, value: string) {
  fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value } })
}

describe('ChangePasswordModal (auth.js:288-357)', () => {
  async function setup() {
    const r = renderWithProviders(
      <>
        <ChangePasswordModal />
        <ToastContainer />
      </>,
    )
    await waitFor(() => expect(document.getElementById('change-password-modal')).toBeInTheDocument())
    act(() => openChangePasswordModal())
    const form = document.getElementById('change-password-form') as HTMLFormElement
    const error = document.getElementById('change-password-error') as HTMLElement
    return { ...r, form, error }
  }

  it('kiểm tra đầu vào theo đúng thứ tự và thông báo của bản gốc', async () => {
    const change = vi.spyOn(api, 'changePassword')
    const { form, error } = await setup()
    fireEvent.submit(form)
    expect(error).toHaveTextContent('Vui lòng điền đầy đủ mật khẩu.')
    fill('cp-old-password', 'old')
    fill('cp-new-password', 'a')
    fill('cp-confirm-password', 'b')
    fireEvent.submit(form)
    expect(error).toHaveTextContent('Xác nhận mật khẩu mới không khớp.')
    fill('cp-confirm-password', 'a')
    fireEvent.submit(form)
    expect(error).toHaveTextContent(
      'Mật khẩu mới không đủ mạnh (Tối thiểu 12 ký tự, đủ chữ hoa, thường, số, ký tự đặc biệt).',
    )
    expect(change).not.toHaveBeenCalled()
  })

  it('gọi api.changePassword(old, new); thành công -> toast và logout sau 1500 ms', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const change = vi.spyOn(api, 'changePassword').mockResolvedValue({ result: 0 })
    const logout = vi.spyOn(authActions, 'logout').mockResolvedValue()
    const { form } = await setup()
    fill('cp-old-password', 'old-pass')
    fill('cp-new-password', STRONG)
    fill('cp-confirm-password', STRONG)
    fireEvent.submit(form)
    await waitFor(() => expect(change).toHaveBeenCalledWith('old-pass', STRONG))
    expect(await screen.findByText('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.')).toBeInTheDocument()
    expect(logout).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(logout).toHaveBeenCalledTimes(1)
    expect(logout).toHaveBeenCalledWith()
    // bản gốc không đóng modal khi thành công
    expect(document.getElementById('change-password-modal')).toHaveAttribute('aria-hidden', 'false')
  })

  it('thất bại -> hiện msg của server hoặc "Đổi mật khẩu thất bại."; nút trở lại "Cập nhật mật khẩu"', async () => {
    const change = vi.spyOn(api, 'changePassword').mockResolvedValueOnce({ result: 1, msg: 'Sai mật khẩu cũ' })
    const { form, error } = await setup()
    fill('cp-old-password', 'old-pass')
    fill('cp-new-password', STRONG)
    fill('cp-confirm-password', STRONG)
    fireEvent.submit(form)
    await waitFor(() => expect(error).toHaveTextContent('Sai mật khẩu cũ'))
    const btn = document.getElementById('btn-submit-change-password') as HTMLButtonElement
    expect(btn).toHaveTextContent('Cập nhật mật khẩu')
    expect(btn).not.toBeDisabled()
    change.mockResolvedValueOnce({ result: 1 })
    fireEvent.submit(form)
    await waitFor(() => expect(error).toHaveTextContent('Đổi mật khẩu thất bại.'))
  })

  it('nút đóng / hủy / click overlay đóng modal, mở lại không xóa form (main.js:214-220)', async () => {
    await setup()
    const modal = document.getElementById('change-password-modal') as HTMLElement
    fill('cp-old-password', 'keep')
    fireEvent.click(document.getElementById('btn-cancel-change-password')!)
    expect(modal).toHaveAttribute('aria-hidden', 'true')
    act(() => openChangePasswordModal())
    expect((document.getElementById('cp-old-password') as HTMLInputElement).value).toBe('keep')
    fireEvent.click(modal)
    expect(modal).toHaveAttribute('aria-hidden', 'true')
    act(() => openChangePasswordModal())
    fireEvent.click(document.getElementById('btn-close-change-password')!)
    expect(modal).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('ForgotPasswordModal (auth.js:359-447)', () => {
  async function setup(username = 'admin', remember = false) {
    const onClose = vi.fn()
    const r = renderWithProviders(
      <>
        <ForgotPasswordModal open onClose={onClose} getUsername={() => username} getRememberMe={() => remember} />
        <ToastContainer />
      </>,
    )
    await waitFor(() => expect(document.getElementById('forgot-password-form')).toBeInTheDocument())
    const form = document.getElementById('forgot-password-form') as HTMLFormElement
    const error = document.getElementById('forgot-password-error') as HTMLElement
    return { ...r, form, error, onClose }
  }

  it('kiểm tra username trước, rồi mật khẩu', async () => {
    const { form, error } = await setup('')
    fireEvent.submit(form)
    expect(error).toHaveTextContent('Vui lòng nhập tài khoản (Username).')
  })

  it('refreshCsrf -> login(username, old) -> lưu phiên -> changePassword -> xóa phiên; toast', async () => {
    const order: string[] = []
    vi.mocked(refreshCsrfToken).mockImplementation(async () => {
      order.push('csrf')
      return 'c'
    })
    vi.spyOn(api, 'login').mockImplementation(async () => {
      order.push('login')
      return { result: 0, jsession: 'tok', account_name: 'acc' }
    })
    vi.spyOn(api, 'changePassword').mockImplementation(async (o, n) => {
      order.push(`change:${o}:${n}`)
      order.push(`token:${sessionStorage.getItem('dashcam_auth_token')}`)
      return { result: 0 }
    })
    const { form, onClose } = await setup('admin')
    fill('old-password', 'old')
    fill('new-password', 'new')
    fill('confirm-new-password', 'new')
    fireEvent.submit(form)
    expect(await screen.findByText('Đổi mật khẩu thành công')).toBeInTheDocument()
    expect(order).toEqual(['csrf', 'login', 'change:old:new', 'token:tok'])
    expect(api.login).toHaveBeenCalledWith('admin', 'old')
    expect(sessionStorage.getItem('dashcam_auth_token')).toBeNull()
    expect(onClose).toHaveBeenCalled()
  })

  it('login sai -> "Mật khẩu cũ không đúng."', async () => {
    vi.spyOn(api, 'login').mockResolvedValue({ result: 1 })
    const { form, error } = await setup('admin')
    fill('old-password', 'old')
    fill('new-password', 'new')
    fill('confirm-new-password', 'new')
    fireEvent.submit(form)
    await waitFor(() => expect(error).toHaveTextContent('Mật khẩu cũ không đúng.'))
    expect(document.getElementById('btn-submit-forgot-password')).toHaveTextContent('Đổi mật khẩu')
  })
})

describe('ResetRequestModal (auth.js:214-284)', () => {
  async function setup() {
    const onClose = vi.fn()
    const r = renderWithProviders(<ResetRequestModal open onClose={onClose} />)
    await waitFor(() => expect(document.getElementById('reset-request-form')).toBeInTheDocument())
    const form = document.getElementById('reset-request-form') as HTMLFormElement
    const error = document.getElementById('reset-request-error') as HTMLElement
    const success = document.getElementById('reset-request-success') as HTMLElement
    return { ...r, form, error, success, onClose }
  }

  it('rỗng -> "Vui lòng nhập tài khoản hoặc email"', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { form, error } = await setup()
    fill('reset-username', '   ')
    fireEvent.submit(form)
    expect(error).toHaveTextContent('Vui lòng nhập tài khoản hoặc email')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('email sai định dạng -> "Email không đúng định dạng"', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { form, error } = await setup()
    fill('reset-username', 'not-an-email@')
    fireEvent.submit(form)
    expect(error).toHaveTextContent('Email không đúng định dạng')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("fetch('/api/reset-password-request') tương đối, CSRF ''; thành công -> thông báo, tự đóng sau 3000 ms", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ result: 0 }), { status: 200 }))
    const { form, success, onClose } = await setup()
    fill('reset-username', '  user1 ')
    fireEvent.submit(form)
    await waitFor(() =>
      expect(success).toHaveTextContent('Yêu cầu đã được gửi. Vui lòng liên hệ quản trị viên để hoàn tất.'),
    )
    expect(success).toBeVisible()
    expect(fetchSpy).toHaveBeenCalledWith('/api/reset-password-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': '' },
      body: JSON.stringify({ account: 'user1' }),
    })
    expect((document.getElementById('reset-username') as HTMLInputElement).value).toBe('')
    expect(onClose).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('lỗi -> msg server hoặc "Không thể gửi yêu cầu."; nút về "Xác nhận"', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: 1, msg: 'Không tồn tại' })))
    const { form, error } = await setup()
    fill('reset-username', 'u')
    fireEvent.submit(form)
    await waitFor(() => expect(error).toHaveTextContent('Không tồn tại'))
    expect(document.getElementById('btn-submit-reset-request')).toHaveTextContent('Xác nhận')
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ result: 1 })))
    fill('reset-username', 'u')
    fireEvent.submit(form)
    await waitFor(() => expect(error).toHaveTextContent('Không thể gửi yêu cầu.'))
  })
})

describe('ResetPasswordModal (SRS §3.1 UI)', () => {
  const STRONG8 = 'Abcdef1!'

  async function setup(open = true) {
    const onClose = vi.fn()
    const r = renderWithProviders(<ResetPasswordModal open={open} onClose={onClose} />)
    await waitFor(() => expect(document.getElementById('reset-password-form')).toBeInTheDocument())
    const form = document.getElementById('reset-password-form') as HTMLFormElement
    const error = document.getElementById('reset-password-error') as HTMLElement
    return { ...r, form, error, onClose }
  }

  it('mismatch -> "Mật khẩu xác nhận không khớp"', async () => {
    const { form, error } = await setup()
    fill('rp-new-password', STRONG8)
    fill('rp-confirm-password', 'Abcdef2!')
    fireEvent.submit(form)
    expect(error).toHaveTextContent('Mật khẩu xác nhận không khớp')
  })

  it('hợp lệ -> hiện success rồi gọi onClose', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { form, onClose } = await setup()
    fill('rp-new-password', STRONG8)
    fill('rp-confirm-password', STRONG8)
    fireEvent.submit(form)
    expect(await screen.findByText('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.')).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('Hủy bỏ gọi onClose', async () => {
    const { onClose } = await setup()
    fireEvent.click(document.getElementById('btn-cancel-reset-password')!)
    expect(onClose).toHaveBeenCalled()
  })
})

describe('LogoutConfirmModal (main.js:203-251)', () => {
  async function setup() {
    const onClose = vi.fn()
    renderWithProviders(<LogoutConfirmModal open onClose={onClose} />)
    await screen.findByText('Bạn có muốn thoát khỏi hệ thống không?')
    return { onClose, modal: document.getElementById('logout-confirm-modal') as HTMLElement }
  }

  it('"Đăng xuất" -> đóng và authActions.logout()', async () => {
    const logout = vi.spyOn(authActions, 'logout').mockResolvedValue()
    const { onClose } = await setup()
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    expect(onClose).toHaveBeenCalled()
    expect(logout).toHaveBeenCalledWith()
  })

  it('"Hủy", nút X hoặc click overlay -> chỉ đóng', async () => {
    const logout = vi.spyOn(authActions, 'logout').mockResolvedValue()
    const { onClose, modal } = await setup()
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    fireEvent.click(modal)
    expect(onClose).toHaveBeenCalledTimes(3)
    expect(logout).not.toHaveBeenCalled()
  })
})
