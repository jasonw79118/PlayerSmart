import { createServer } from 'node:http'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { checkDatabase, closeDatabase } from './database.mjs'

const host = '127.0.0.1'
const port = Number(process.env.API_PORT || 4180)
const jwksUrl = process.env.NEON_AUTH_JWKS_URL
const authBaseUrl = process.env.NEON_AUTH_BASE_URL
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null
const issuer = authBaseUrl ? new URL(authBaseUrl).origin : null

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' || request.url !== '/api/health') {
    if (request.method === 'GET' && request.url === '/api/me') {
      const authorization = request.headers.authorization
      const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
      if (!token || !jwks || !issuer) {
        response.writeHead(token ? 503 : 401, { 'content-type': 'application/json', 'cache-control': 'no-store' })
        response.end(JSON.stringify({ error: token ? 'Authentication unavailable' : 'Unauthorized' }))
        return
      }
      try {
        const { payload } = await jwtVerify(token, jwks, { issuer })
        if (!payload.sub) throw new Error('Missing subject')
        response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
        response.end(JSON.stringify({ authenticated: true }))
      } catch {
        response.writeHead(401, { 'content-type': 'application/json', 'cache-control': 'no-store' })
        response.end(JSON.stringify({ error: 'Unauthorized' }))
      }
      return
    }

    if (request.method !== 'GET' || request.url !== '/api/health') {
    response.writeHead(404, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ error: 'Not found' }))
    return
    }
  }

  try {
    await checkDatabase()
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
    response.end(JSON.stringify({ status: 'ok', database: 'connected' }))
  } catch {
    response.writeHead(503, { 'content-type': 'application/json', 'cache-control': 'no-store' })
    response.end(JSON.stringify({ status: 'unavailable', database: 'unavailable' }))
  }
})

server.listen(port, host, () => console.log(`PlayerSmart API listening on http://${host}:${port}`))
server.on('close', closeDatabase)
process.on('SIGINT', () => server.close(() => process.exit(0)))
process.on('SIGTERM', () => server.close(() => process.exit(0)))
