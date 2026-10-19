import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { useAuthStore } from '../../shared/auth/authStore'
import { hasPersistentSession } from '../../shared/auth/session'
import { Button } from '../../shared/ui/Button'
import { playbackInit } from '../playback/init'
import { useLoginMutation } from './mutations'
import { ResetRequestModal } from './ResetRequestModal'
import { firstError, loginSchema } from './schemas'

// playback.js:1955 — window.addEventListener('auth-success', () => PlaybackModule.init(), { once: true })
let playbackInitOnFirstLogin = false

const LOGIN_BG =
  "linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.7) 100%), url('/images/login-bg.jpg') no-repeat center center / cover"

function EyeIcon({ open }: { open: boolean }) {
  // auth.js:582-584
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </>
      )}
    </svg>
  )
}

const inputClass =
  'w-full rounded-md border border-border py-3.5 pr-10 pl-12 font-sans text-base transition-[border-color,box-shadow] duration-250 focus:border-primary focus:shadow-[0_0_0_3px_rgba(42,157,216,0.15)] focus:outline-none'
const iconClass = 'pointer-events-none absolute left-4 size-5 text-[#94a3b8]'

/**
 * #login-container (index.html:55-163) + handleLogin (auth.js:160-212)
 * + phần giao diện của showLogin (main.js:99-131).
 */
export function LoginScreen({ hidden }: { hidden: boolean }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  // auth.js:570-573 — khôi phục checkbox lúc init
  const [rememberMe, setRememberMe] = useState(() => hasPersistentSession())
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [btn, setBtn] = useState({ disabled: false, label: 'ĐĂNG NHẬP' })
  const [resetOpen, setResetOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const loginMutation = useLoginMutation()
  // main.js:100 isAlreadyVisible — login-container đang hiển thị do lần showLogin trước
  const loginVisibleRef = useRef(false)

  useEffect(() => {
    // Mỗi lần store đổi = một lời gọi showApp/showLogin (authStore chỉ có hai setter này).
    return useAuthStore.subscribe((state) => {
      if (state.view === 'app') {
        loginVisibleRef.current = false
        return
      }
      const reason = state.logoutReason
      if (!loginVisibleRef.current) {
        setError(reason)
        // document.getElementById('login-form').reset()
        setUsername('')
        setPassword('')
        setRememberMe(false)
      } else if (reason) {
        // Nếu đã hiển thị mà có lỗi mới thì chỉ cập nhật text báo lỗi
        setError(reason)
      }
      loginVisibleRef.current = true
      // auth.js:467-468 logout() luôn xóa ô mật khẩu
      setPassword('')
      setBtn({ disabled: false, label: 'Đăng nhập' })
    })
  }, [])

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const user = username.trim()
    const pass = password
    const err = firstError(loginSchema, { username: user, password: pass })
    if (err) {
      setError(err)
      return
    }

    setBtn({ disabled: true, label: 'Đang xác thực…' })
    setError('')

    const result = await loginMutation.mutateAsync({ username: user, password: pass, rememberMe })
    setPassword('')
    if (result.ok) {
      if (!playbackInitOnFirstLogin) {
        playbackInitOnFirstLogin = true
        playbackInit()
      }
    } else {
      setError(result.error)
      setBtn({ disabled: false, label: 'ĐĂNG NHẬP' })
    }
  }

  const openResetRequest = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    // clearResetRequestForm + setResetModalVisible(true): remount để xóa form
    setResetKey((k) => k + 1)
    setResetOpen(true)
  }

  return (
    <>
      <div
        id="login-container"
        hidden={hidden}
        className="flex h-screen w-full animate-fade-in overflow-x-hidden overflow-y-auto bg-[#f1f5f9] font-sans max-[768px]:h-auto max-[768px]:min-h-screen max-[768px]:flex-col"
      >
        <div
          className="relative flex flex-[1.2] flex-col justify-between p-16 text-white max-[1024px]:p-8 max-[768px]:hidden"
          style={{ background: LOGIN_BG }}
        >
          <div className="my-auto">
            <div className="mb-8"></div>
            <h1 className="mb-2 text-5xl font-bold text-white max-[1366px]:text-[2.5rem] max-[1024px]:text-[2rem]">
              {' '}
              HỆ THỐNG QUẢN LÝ TÀI XẾ
            </h1>
            <p className="mb-12 text-xl opacity-90">Quản lý tối ưu, Vận hành hiệu quả.</p>
            <div className="mt-16 flex gap-10 text-[1.1rem] font-medium"></div>
          </div>
        </div>
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-clip bg-[#f8fafc] max-[768px]:min-h-screen">
          <div className="absolute top-6 right-8 z-10 flex items-center justify-end gap-6 p-2 font-medium text-text-main max-[768px]:top-2 max-[768px]:right-2">
            <div className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-4 py-2 text-base font-semibold shadow-sm">
              <img src="https://flagcdn.com/w20/vn.png" alt="VN" className="h-auto w-5" /> VN/EN
            </div>
          </div>

          <div className="mx-auto flex max-h-[95vh] w-[90%] max-w-[480px] shrink flex-col justify-center rounded-[12px] bg-white px-[clamp(1.5rem,5vw,3rem)] py-[clamp(1.5rem,4vh,3rem)] shadow-[0_20px_40px_rgba(0,0,0,0.05)]">
            <h1 className="mb-[clamp(0.25rem,1vh,0.5rem)] text-center text-[clamp(1.25rem,3vh,1.75rem)] font-bold text-text-main">
              ĐĂNG NHẬP
            </h1>
            <form id="login-form" onSubmit={handleLogin}>
              <div className="mb-[clamp(0.875rem,2.5vh,1.5rem)]">
                <label htmlFor="username" className="mb-2 block text-[0.9rem] font-semibold text-text-main">
                  Tài khoản (Username)
                </label>
                <div className="relative flex items-center">
                  <svg
                    className={iconClass}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    required
                    aria-required="true"
                    autoComplete="username"
                    className={inputClass}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-[clamp(0.875rem,2.5vh,1.5rem)]">
                <label htmlFor="password" className="mb-2 block text-[0.9rem] font-semibold text-text-main">
                  Mật khẩu
                </label>
                <div className="relative flex items-center">
                  <svg
                    className={iconClass}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    required
                    aria-required="true"
                    autoComplete="current-password"
                    className={inputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-4 flex cursor-pointer border-none bg-transparent p-0 text-[#94a3b8] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <div className="mb-[clamp(1rem,3vh,2rem)] flex items-center justify-between text-[0.9rem]">
                <label className="flex cursor-pointer items-center gap-2 text-text-muted">
                  <input
                    type="checkbox"
                    id="remember-me"
                    name="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="focus-visible:outline-2 focus-visible:outline-primary"
                  />{' '}
                  Ghi nhớ đăng nhập
                </label>
                <a
                  href="#"
                  id="reset-request-link"
                  className="font-medium text-primary no-underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
                  onClick={openResetRequest}
                >
                  Quên mật khẩu?
                </a>
              </div>

              <div id="login-error" className="mb-4 min-h-5 text-sm text-danger" role="alert" aria-live="assertive">
                {error}
              </div>

              <Button type="submit" id="login-btn" variant="primary" size="block" disabled={btn.disabled}>
                {btn.label}
              </Button>
            </form>
          </div>
        </div>
      </div>
      <ResetRequestModal key={resetKey} open={resetOpen} onClose={() => setResetOpen(false)} />
    </>
  )
}
