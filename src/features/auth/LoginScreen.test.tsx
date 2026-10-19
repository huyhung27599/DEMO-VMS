import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { authActions, useAuthStore, type LoginResult } from '../../shared/auth/authStore'
import { LoginScreen } from './LoginScreen'

vi.mock('../playback/init', () => ({ playbackInit: vi.fn() }))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  useAuthStore.setState({ view: 'login', username: '', logoutReason: '', hasShownApp: false })
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function setup() {
  const r = renderWithProviders(<LoginScreen hidden={false} />)
  await waitFor(() => expect(r.container.querySelector('#username')).toBeInTheDocument())
  // tương đương checkAuthState -> showLogin() lúc tải trang
  act(() => authActions.showLogin())
  const form = r.container.querySelector('#login-form') as HTMLFormElement
  const user = r.container.querySelector('#username') as HTMLInputElement
  const pass = screen.getByLabelText('Mật khẩu') as HTMLInputElement
  const remember = screen.getByLabelText('Ghi nhớ đăng nhập') as HTMLInputElement
  const btn = r.container.querySelector('#login-btn') as HTMLButtonElement
  const error = r.container.querySelector('#login-error') as HTMLElement
  return { ...r, form, user, pass, remember, btn, error }
}

describe('LoginScreen', () => {
  it('submit rỗng (hoặc username toàn khoảng trắng) -> thông báo, không gọi login', async () => {
    const login = vi.spyOn(authActions, 'login')
    const { form, user, pass, error, btn } = await setup()
    fireEvent.submit(form)
    expect(error).toHaveTextContent('Vui lòng nhập tài khoản và mật khẩu.')
    fireEvent.change(user, { target: { value: '   ' } })
    fireEvent.change(pass, { target: { value: 'x' } })
    fireEvent.submit(form)
    expect(error).toHaveTextContent('Vui lòng nhập tài khoản và mật khẩu.')
    expect(login).not.toHaveBeenCalled()
    expect(btn).not.toBeDisabled()
  })

  it("đang chạy: nút disable, nhãn 'Đang xác thực…'; trim username, không trim password", async () => {
    let resolve!: (r: LoginResult) => void
    const login = vi.spyOn(authActions, 'login').mockImplementation(
      () => new Promise<LoginResult>((r) => (resolve = r)),
    )
    const { form, user, pass, remember, btn, error } = await setup()
    fireEvent.change(user, { target: { value: '  admin ' } })
    fireEvent.change(pass, { target: { value: ' p w ' } })
    fireEvent.click(remember)
    fireEvent.submit(form)
    await waitFor(() => expect(btn).toBeDisabled())
    expect(btn).toHaveTextContent('Đang xác thực…')
    expect(error).toHaveTextContent('')
    expect(login).toHaveBeenCalledWith('admin', ' p w ', true)
    await act(async () => resolve({ ok: false, error: 'x' }))
  })

  it("lỗi: nút về 'ĐĂNG NHẬP', ô mật khẩu bị xóa, hiện thông báo lỗi", async () => {
    vi.spyOn(authActions, 'login').mockResolvedValue({ ok: false, error: 'Sai mật khẩu' })
    const { form, user, pass, btn, error } = await setup()
    fireEvent.change(user, { target: { value: 'admin' } })
    fireEvent.change(pass, { target: { value: 'pw' } })
    fireEvent.submit(form)
    await waitFor(() => expect(error).toHaveTextContent('Sai mật khẩu'))
    expect(btn).not.toBeDisabled()
    expect(btn.textContent?.trim()).toBe('ĐĂNG NHẬP')
    expect(pass.value).toBe('')
    expect(user.value).toBe('admin')
  })

  it("showLogin luôn đặt nhãn nút 'Đăng nhập' (main.js:126-130)", async () => {
    const { btn } = await setup()
    expect(btn.textContent?.trim()).toBe('Đăng nhập')
  })

  it('logoutReason hiển thị đúng như main.js:99-130', async () => {
    const { user, pass, remember, error } = await setup()
    // đang ở app -> đăng xuất kèm lý do: chưa hiển thị nên reset form và đặt lỗi = lý do
    act(() => authActions.showApp('admin'))
    fireEvent.change(user, { target: { value: 'abc' } })
    fireEvent.change(pass, { target: { value: 'secret' } })
    fireEvent.click(remember)
    act(() => authActions.showLogin('Phiên đăng nhập hết thời gian. Vui lòng đăng nhập lại.'))
    expect(error).toHaveTextContent('Phiên đăng nhập hết thời gian. Vui lòng đăng nhập lại.')
    expect(user.value).toBe('')
    expect(pass.value).toBe('')
    expect(remember.checked).toBe(false)

    // đã hiển thị + lý do rỗng: KHÔNG xóa lỗi, không reset form
    fireEvent.change(user, { target: { value: 'abc' } })
    act(() => authActions.showLogin(''))
    expect(error).toHaveTextContent('Phiên đăng nhập hết thời gian. Vui lòng đăng nhập lại.')
    expect(user.value).toBe('abc')

    // đã hiển thị + có lý do mới: chỉ cập nhật lỗi
    act(() => authActions.showLogin('Khác'))
    expect(error).toHaveTextContent('Khác')
    expect(user.value).toBe('abc')
  })

  it("link 'Quên mật khẩu?' mở modal yêu cầu khôi phục", async () => {
    await setup()
    const dialog = () => document.getElementById('reset-request-modal') as HTMLElement
    expect(dialog()).toHaveAttribute('aria-hidden', 'true')
    fireEvent.change(document.getElementById('reset-username')!, { target: { value: 'cũ' } })
    fireEvent.click(screen.getByText('Quên mật khẩu?'))
    expect(dialog()).toHaveAttribute('aria-hidden', 'false')
    // clearResetRequestForm: mở lại thì ô nhập trống
    expect((document.getElementById('reset-username') as HTMLInputElement).value).toBe('')
    // href="#" bị preventDefault: không đổi URL
    expect(window.location.hash).toBe('')
  })

  it('nút ẩn/hiện mật khẩu đổi type của ô mật khẩu', async () => {
    const { pass } = await setup()
    fireEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }))
    expect(pass).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }))
    expect(pass).toHaveAttribute('type', 'password')
  })
})
