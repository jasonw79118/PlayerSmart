import { createInternalNeonAuth } from '@neondatabase/auth'

const authUrl = import.meta.env.VITE_NEON_AUTH_URL

/** Public Neon Auth URL only; never put database credentials in Vite variables. */
const neonAuthClient = authUrl ? createInternalNeonAuth(authUrl) : null
export const neonAuth = neonAuthClient?.adapter ?? null
export const neonAuthConfigured = Boolean(neonAuth)

export async function getNeonAuthToken() {
  return neonAuthClient?.getJWTToken() ?? null
}
