import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Outlet, useNavigate, useRouter } from '@tanstack/react-router'
import { ChangePasswordModal } from '../features/auth/ChangePasswordModal'
import { LoginScreen } from '../features/auth/LoginScreen'
import { AiToastStack } from '../features/event-server/components/AiToastStack'
import { playbackInit } from '../features/playback/init'
import { authActions, useAuthStore } from '../shared/auth/authStore'
import { resetActivityTimer, setupActivityListeners } from '../shared/auth/inactivity'
import { getUsername, isAuthenticated } from '../shared/auth/session'
import { ToastContainer } from '../shared/ui/ToastContainer'
import { AppShell } from './AppShell'
import { currentRoute, DEFAULT_ROUTE } from './useActiveSection'

// checkAuthState chỉ chạy một lần cho mỗi router (StrictMode chạy effect hai lần).
const checkedRouters = new WeakSet<object>()

export function RootLayout() {
  const router = useRouter()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const view = useAuthStore((s) => s.view)
  const lastViewRef = useRef(view)

  // AuthModule.init (auth.js:486-490) + checkAuthState (main.js:31-37, 262)
  useEffect(() => {
    if (checkedRouters.has(router)) return
    checkedRouters.add(router)
    if (isAuthenticated()) {
      setupActivityListeners()
      resetActivityTimer()
      authActions.showApp(getUsername())
    } else {
      authActions.showLogin()
    }
  }, [router])

  // Phần điều hướng/side effect của showApp (main.js:39-82) và showLogin (main.js:99-107).
  useEffect(() => {
    if (lastViewRef.current === view) return
    lastViewRef.current = view
    if (view === 'app') {
      // main.js:60-62 PlaybackModule.init() mỗi lần showApp (Ruling R4)
      playbackInit()
      // main.js:70-80: '#login' hoặc route mặc định -> Router.navigate('dashboard') (push)
      const route = currentRoute(router.state.location.pathname)
      if (route === 'login' || route === DEFAULT_ROUTE) void navigate({ to: '/dashboard' })
      // main.js:81 loadDashboardData()
      void queryClient.refetchQueries({ queryKey: ['dashboard'] })
    } else {
      // main.js:102-107 window.location.replace('#login')
      void navigate({ to: '/login', replace: true })
    }
  }, [view, router, navigate, queryClient])

  return (
    <>
      <LoginScreen hidden={view !== 'login'} />
      <AppShell hidden={view !== 'app'} />
      <Outlet />
      <ChangePasswordModal />
      <ToastContainer />
      <AiToastStack />
    </>
  )
}
