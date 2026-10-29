import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { createLocalDraftStore, localDraftMiddleware } from './server/local-draft'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? '/PlayerSmart/' : '/',
  plugins: [react(), tailwindcss(), {
    name: 'local-auth-origin',
    configureServer(server) {
      server.middlewares.use(localDraftMiddleware(createLocalDraftStore(resolve(server.config.root, '.playersmart-draft.local'))))
      // Neon allows localhost sign-in; 127.0.0.1 is a different, untrusted origin.
      server.middlewares.use((request, response, next) => {
        const host = request.headers.host
        if (request.method === 'GET' && request.headers.accept?.includes('text/html') && host && /^127\.0\.0\.1(?::\d+)?$/.test(host)) {
          response.writeHead(302, {
            Location: `http://${host.replace('127.0.0.1', 'localhost')}${request.url ?? '/'}`,
            'Cache-Control': 'no-store',
          })
          response.end()
          return
        }
        next()
      })
    },
  }],
  server: {
    host: 'localhost',
    proxy: {
      '/api/askref': 'http://127.0.0.1:5188',
      '/api': 'http://127.0.0.1:4180',
    },
  },
})
