import type { Connect, Plugin } from 'vite'

const api404Middleware: Connect.NextHandleFunction = (req, res, next) => {
  if (req.url?.startsWith('/api/')) {
    res.statusCode = 404
    res.end()
    return
  }
  next()
}

export function api404(): Plugin {
  return {
    name: 'api404',
    configureServer(server) {
      server.middlewares.use(api404Middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(api404Middleware)
    },
  }
}
