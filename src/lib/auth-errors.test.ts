import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInternalNeonAuth } from '@neondatabase/auth'
import { accountRequestError } from './auth-errors'

afterEach(() => vi.unstubAllGlobals())

describe('Neon account request errors', () => {
  it('classifies the actual installed SDK exception for rejected credentials rather than calling it a network failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' }, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = createInternalNeonAuth('https://auth.example.test/neondb/auth')
    let caught: unknown
    try { await client.adapter.signIn.email({ email: 'fictional@example.test', password: 'fictional-test-value' }) }
    catch (error) { caught = error }
    expect(caught).toMatchObject({ name: 'AuthApiError', code: 'invalid_credentials', status: 401 })
    expect(accountRequestError(caught)).toMatch(/rejected that email or password/i)
    expect(accountRequestError(caught)).not.toMatch(/connection|reach/i)
    expect(fetchMock).toHaveBeenCalled()
  })
  it.each([
    [{ code: 'email_not_confirmed', status: 400 }, /verify your email/i],
    [{ code: 'email_not_confirmed', status: 401 }, /verify your email/i],
    [{ code: 'invalid_credentials', status: 401 }, /forgot password/i],
    [{ status: 429 }, /wait a few minutes/i],
    [{ status: 503 }, /temporarily unavailable/i],
    [{ status: 403 }, /refused this request/i],
    [new TypeError('Failed to fetch'), /browser could not complete/i],
  ])('provides a specific explanation for %j', (error, expected) => {
    expect(accountRequestError(error)).toMatch(expected)
  })
  it('never displays a provider message that could contain submitted data', () => {
    expect(accountRequestError({ status: 400, message: 'private submitted password or email' })).not.toContain('private submitted')
  })
})
