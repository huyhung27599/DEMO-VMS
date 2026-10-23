import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildQueryString,
  clearSecurityContext,
  fetchApi,
  registerAuthBridge,
  resolveBaseUrl,
} from './client'

const BASE = resolveBaseUrl(window.location)

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

const csrf = (t = 'csrf-1') => jsonResponse({ result: 0, csrfToken: t })

describe('resolveBaseUrl', () => {
  it('localhost uses same-origin /api so the dev proxy can forward cookies', () => {
    expect(resolveBaseUrl({ hostname: 'localhost', protocol: 'http:' })).toBe('/api/')
    expect(resolveBaseUrl({ hostname: '127.0.0.1', protocol: 'http:' })).toBe('/api/')
  })
  it('other hosts call the remote API directly', () => {
    expect(resolveBaseUrl({ hostname: '192.168.1.5', protocol: 'http:' })).toBe(
      'http://119.17.211.170:4000/api/',
    )
    expect(
      resolveBaseUrl({ hostname: 'dashcam.geicdashcam.cloud', protocol: 'https:' }),
    ).toBe('http://119.17.211.170:4000/api/')
  })
})

describe('buildQueryString', () => {
  it('skips empty values and encodes', () => {
    expect(buildQueryString({ a: 1, b: '', c: null, d: undefined, e: 'x y' })).toBe(
      '?a=1&e=x%20y',
    )
  })
  it('empty -> empty string', () => {
    expect(buildQueryString({})).toBe('')
  })
})

describe('fetchApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  const logout = vi.fn()
  let atLogin = false

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1700000000000))
    clearSecurityContext()
    sessionStorage.clear()
    localStorage.clear()
    sessionStorage.setItem('dashcam_auth_token', 'tok')
    logout.mockClear()
    atLogin = false
    registerAuthBridge({ isAtLogin: () => atLogin, logout })
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('GET sends jsession, _t, headers and options', async () => {
    fetchMock.mockResolvedValueOnce(csrf()).mockResolvedValueOnce(jsonResponse({ result: 0 }))
    const res = await fetchApi('vehicle/list', { q: 'a' })
    expect(res).toEqual({ result: 0 })
    const [url, opts] = fetchMock.mock.calls[1]
    expect(url).toBe(`${BASE}vehicle/list?q=a&jsession=tok&_t=1700000000000`)
    expect(opts.headers['X-CSRF-Token']).toBe('csrf-1')
    expect(opts.headers.Authorization).toBe('Bearer tok')
    expect(opts.credentials).toBe('include')
    expect(opts.cache).toBe('no-store')
    expect(opts.method).toBe('GET')
  })

  it('mutates caller params', async () => {
    fetchMock.mockResolvedValueOnce(csrf()).mockResolvedValueOnce(jsonResponse({ result: 0 }))
    const params: Record<string, unknown> = {}
    await fetchApi('x', params)
    expect(params).toEqual({ jsession: 'tok', _t: 1700000000000 })
  })

  it('falls back to localStorage token', async () => {
    sessionStorage.clear()
    localStorage.setItem('dashcam_auth_token', 'loc')
    fetchMock.mockResolvedValueOnce(csrf()).mockResolvedValueOnce(jsonResponse({ result: 0 }))
    await fetchApi('x')
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer loc')
  })

  it('POST sends JSON body with jsession and no _t', async () => {
    fetchMock.mockResolvedValueOnce(csrf()).mockResolvedValueOnce(jsonResponse({ result: 0 }))
    await fetchApi('login', { account: 'a' }, 'post')
    const [url, opts] = fetchMock.mock.calls[1]
    expect(url).toBe(`${BASE}login`)
    expect(opts.method).toBe('POST')
    expect(opts.body).toBe(JSON.stringify({ account: 'a', jsession: 'tok' }))
    expect(opts.body).not.toContain('_t')
  })

  it('fetches CSRF only once for two calls', async () => {
    fetchMock
      .mockResolvedValueOnce(csrf())
      .mockResolvedValueOnce(jsonResponse({ result: 0 }))
      .mockResolvedValueOnce(jsonResponse({ result: 0 }))
    await fetchApi('a')
    await fetchApi('b')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith('csrf-token'))).toHaveLength(1)
  })

  it('403 refreshes CSRF and retries exactly once', async () => {
    fetchMock
      .mockResolvedValueOnce(csrf('old'))
      .mockResolvedValueOnce(jsonResponse({}, 403))
      .mockResolvedValueOnce(csrf('new'))
      .mockResolvedValueOnce(jsonResponse({ result: 0 }))
    const res = await fetchApi('a')
    expect(res).toEqual({ result: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[3][1].headers['X-CSRF-Token']).toBe('new')
  })

  it('403 twice does not retry again', async () => {
    fetchMock
      .mockResolvedValueOnce(csrf('old'))
      .mockResolvedValueOnce(jsonResponse({}, 403))
      .mockResolvedValueOnce(csrf('new'))
      .mockResolvedValueOnce(jsonResponse({}, 403))
    const res = await fetchApi('a')
    expect(res).toEqual({ result: 99, msg: 'HTTP Error 403' })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('401 triggers logout with message after setTimeout 0', async () => {
    fetchMock.mockResolvedValueOnce(csrf()).mockResolvedValueOnce(jsonResponse({}, 401))
    const res = await fetchApi('vehicle/x')
    expect(res).toEqual({ result: 5, msg: 'Session expired or revoked.' })
    expect(logout).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(logout).toHaveBeenCalledWith('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.')
  })

  it('401 at login logs out silently', async () => {
    atLogin = true
    fetchMock.mockResolvedValueOnce(csrf()).mockResolvedValueOnce(jsonResponse({}, 401))
    await fetchApi('vehicle/x')
    vi.runAllTimers()
    expect(logout).toHaveBeenCalledTimes(1)
    expect(logout.mock.calls[0]).toEqual([])
  })

  it('401 for face/ returns 401 and no logout', async () => {
    fetchMock.mockResolvedValueOnce(csrf()).mockResolvedValueOnce(jsonResponse({}, 401))
    const res = await fetchApi('face/health')
    expect(res).toEqual({ result: 401, msg: 'Session expired or revoked.' })
    vi.runAllTimers()
    expect(logout).not.toHaveBeenCalled()
  })

  it('200 with string result 5 logs out with upstream message', async () => {
    fetchMock
      .mockResolvedValueOnce(csrf())
      .mockResolvedValueOnce(jsonResponse({ result: '5' }))
    const res = await fetchApi('vehicle/x')
    expect(res).toEqual({ result: 5, msg: 'Session expired on upstream server.' })
    vi.runAllTimers()
    expect(logout).toHaveBeenCalledWith(
      'Phiên làm việc trên máy chủ đã hết hạn. Vui lòng đăng nhập lại.',
    )
  })

  it('500 -> result 99', async () => {
    fetchMock.mockResolvedValueOnce(csrf()).mockResolvedValueOnce(jsonResponse({}, 500))
    expect(await fetchApi('a')).toEqual({ result: 99, msg: 'HTTP Error 500' })
  })

  it('fetch throwing -> result 99', async () => {
    fetchMock.mockResolvedValueOnce(csrf()).mockRejectedValueOnce(new Error('boom'))
    expect(await fetchApi('a')).toEqual({ result: 99, msg: 'Fetch exception: boom' })
  })
})
