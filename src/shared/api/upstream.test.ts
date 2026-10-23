import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client', async (orig) => {
  const actual = await orig<typeof import('./client')>()
  return { ...actual, fetchApi: vi.fn() }
})

import { fetchApi } from './client'
import { clearUpstreamSession, fetchUpstream, UPSTREAM_BASE } from './upstream'

const session = vi.mocked(fetchApi)
const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as Response

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  clearUpstreamSession()
  sessionStorage.setItem('dashcam_auth_token', 'T1')
  session.mockReset().mockResolvedValue({ result: 0, upstreamJsession: 'J1' })
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('fetchUpstream', () => {
  it('gọi thẳng 808gps với jsession upstream, không gửi credentials', async () => {
    fetchMock.mockResolvedValue(json({ result: 0, x: 1 }))
    const res = await fetchUpstream('A.action', { id: 1, empty: '' })
    expect(res).toEqual({ result: 0, x: 1 })
    expect(fetchMock).toHaveBeenCalledWith(`${UPSTREAM_BASE}A.action?id=1&jsession=J1`, { cache: 'no-store' })
    expect(session).toHaveBeenCalledWith('upstream-session')
  })

  it('cache jsession giữa các lần gọi, đổi token backend thì lấy lại', async () => {
    fetchMock.mockResolvedValue(json({ result: 0 }))
    await fetchUpstream('A.action')
    await fetchUpstream('A.action')
    expect(session).toHaveBeenCalledTimes(1)
    sessionStorage.setItem('dashcam_auth_token', 'T2')
    await fetchUpstream('A.action')
    expect(session).toHaveBeenCalledTimes(2)
  })

  it('result 5 → lấy jsession mới và retry một lần', async () => {
    session
      .mockResolvedValueOnce({ result: 0, upstreamJsession: 'OLD' })
      .mockResolvedValueOnce({ result: 0, upstreamJsession: 'NEW' })
    fetchMock.mockResolvedValueOnce(json({ result: 5 })).mockResolvedValueOnce(json({ result: 0 }))
    expect(await fetchUpstream('A.action')).toEqual({ result: 0 })
    expect(fetchMock.mock.calls[1][0]).toContain('jsession=NEW')
  })

  it('không có jsession upstream → result 5, không fetch', async () => {
    session.mockResolvedValue({ result: 0 })
    expect((await fetchUpstream('A.action')).result).toBe(5)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('HTTP lỗi → 99; fetch throw → 99', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce(json({}, false, 500))
    expect((await fetchUpstream('A.action')).result).toBe(99)
    fetchMock.mockRejectedValueOnce(new Error('net'))
    expect((await fetchUpstream('A.action')).result).toBe(99)
  })
})
