import { verifySignedInRequest } from '../_shared/auth'

export async function onRequestGet({ request, env }: { request: Request; env: { NEON_AUTH_JWKS_URL?: string; NEON_AUTH_BASE_URL?: string } }) {
  if (!(await verifySignedInRequest(request, env))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'cache-control': 'no-store' } })
  }
  return Response.json({ authenticated: true }, { headers: { 'cache-control': 'no-store' } })
}
