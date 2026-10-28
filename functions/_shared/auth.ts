import { createRemoteJWKSet, jwtVerify } from 'jose'

export type AuthEnv = { NEON_AUTH_JWKS_URL?: string; NEON_AUTH_BASE_URL?: string }

const jwksByUrl = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

export async function getSignedInSubject(request: Request, env: AuthEnv) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  const jwksUrl = env.NEON_AUTH_JWKS_URL
  const authBaseUrl = env.NEON_AUTH_BASE_URL
  if (!token || !jwksUrl || !authBaseUrl) return null
  try {
    const jwks = jwksByUrl.get(jwksUrl) ?? createRemoteJWKSet(new URL(jwksUrl))
    jwksByUrl.set(jwksUrl, jwks)
    const { payload } = await jwtVerify(token, jwks, { issuer: new URL(authBaseUrl).origin })
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

export async function verifySignedInRequest(request: Request, env: AuthEnv) {
  return Boolean(await getSignedInSubject(request, env))
}
