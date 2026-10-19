import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'

vi.mock('leaflet', () => import('../../test/leafletMock'))
vi.mock('../../shared/map/territorial', () => ({ addTerritorialOverlays: vi.fn() }))

import { renderApp, type AppResult } from '../../test/renderWithProviders'
import { useAuthStore } from '../../shared/auth/authStore'
import { setTrackMap } from './videoController'

// Tích hợp với router/Sidebar thật: mốc thời gian tuyệt đối kể từ lúc click nav "Phát lại video".

let app: AppResult | null = null

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  sessionStorage.clear()
  sessionStorage.setItem('dashcam_auth_token', 'tok')
  sessionStorage.setItem('dashcam_auth_user', 'admin')
  useAuthStore.setState({ view: 'login', username: '', logoutReason: '', hasShownApp: false })
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ result: 1 }), { status: 200 })),
  )
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
  app?.history.destroy()
  app = null
  setTrackMap(null)
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PlaybackSection trong app', () => {
  it('click nav playback từ dashboard: handleResize tại +220 (click), +450 và +950 ms (switchSection 150 + 300/800)', async () => {
    app = renderApp({ hash: '#dashboard' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    const map = { invalidateSize: vi.fn() }
    setTrackMap(map)
    const nav = screen.getByRole('button', { name: /Phát lại video/ })
    const at: number[] = []
    const t0 = Date.now()
    map.invalidateSize.mockImplementation(() => at.push(Date.now() - t0))

    fireEvent.click(nav)
    for (let i = 0; i < 100; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })
    }
    expect(window.location.hash).toBe('#playback')
    expect(at).toEqual([220, 450, 950])
  })
})
