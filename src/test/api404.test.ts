import { createServer, type ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { api404 } from '../../vite-plugins/api404.ts'

describe('api404 plugin', () => {
  let server: ViteDevServer
  let base: string

  beforeAll(async () => {
    server = await createServer({
      configFile: false,
      plugins: [api404()],
      server: { port: 0, host: '127.0.0.1' },
      logLevel: 'silent',
    })
    await server.listen()
    const addr = server.httpServer!.address()
    if (!addr || typeof addr === 'string') throw new Error('no address')
    base = `http://127.0.0.1:${addr.port}`
  })

  afterAll(async () => {
    await server.close()
  })

  it('returns 404 for /api/ requests', async () => {
    const res = await fetch(`${base}/api/reset-password-request`)
    expect(res.status).toBe(404)
  })

  it('serves / with HTML', async () => {
    const res = await fetch(`${base}/`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('<')
  })
})
