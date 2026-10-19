import type { RouterHistory } from '@tanstack/history'
import { createLegacyHashHistory, hashToPath, pathToHash } from './legacyHashHistory'

let history: RouterHistory | null = null

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  history?.destroy()
  history = null
})

describe('createLegacyHashHistory', () => {
  it("đọc '#Driver' thành pathname '/Driver'", () => {
    window.location.hash = '#Driver'
    history = createLegacyHashHistory()
    expect(history.location.pathname).toBe('/Driver')
  })

  it("hash rỗng thành '/'", () => {
    history = createLegacyHashHistory()
    expect(history.location.pathname).toBe('/')
  })

  it("'#/dashboard' không bị chuẩn hóa thành '/dashboard'", () => {
    window.location.hash = '#/dashboard'
    history = createLegacyHashHistory()
    expect(history.location.pathname).not.toBe('/dashboard')
  })

  it("push('/vehicle') ghi '#vehicle' và history.length tăng 1", () => {
    history = createLegacyHashHistory()
    const before = window.history.length
    history.push('/vehicle')
    expect(window.location.hash).toBe('#vehicle')
    expect(history.length).toBe(before + 1)
    expect(history.location.pathname).toBe('/vehicle')
  })

  it("replace('/login') ghi '#login' và history.length không đổi", () => {
    history = createLegacyHashHistory()
    const before = window.history.length
    history.replace('/login')
    expect(window.location.hash).toBe('#login')
    expect(history.length).toBe(before)
  })

  it('hashchange do người dùng gõ thông báo cho subscriber đúng một lần', async () => {
    history = createLegacyHashHistory()
    const sub = vi.fn()
    history.subscribe(sub)
    window.location.hash = '#map'
    await new Promise((r) => setTimeout(r, 0))
    expect(history.location.pathname).toBe('/map')
    expect(sub).toHaveBeenCalledTimes(1)
  })

  it('createHref giữ pathname/search và dùng dạng #route', () => {
    history = createLegacyHashHistory()
    expect(history.createHref('/settings')).toBe('/#settings')
  })
})

describe('hashToPath / pathToHash', () => {
  it('chuyển đổi hai chiều', () => {
    expect(hashToPath('dashboard')).toBe('/dashboard')
    expect(hashToPath('')).toBe('/')
    expect(pathToHash('/vehicle')).toBe('vehicle')
  })
})
