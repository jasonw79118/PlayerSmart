import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestPost } from './askref'

afterEach(() => vi.unstubAllGlobals())

describe('Cloudflare AskRef Function', () => {
  it('rejects anonymous inference requests', async () => {
    const ai = { run: vi.fn() }
    const response = await onRequestPost({
      request: new Request('https://example.test/api/askref', { method: 'POST', body: JSON.stringify({ question: 'What is offside?' }) }),
      env: { AI: ai, AI_GATEWAY_ID: 'playersmart-askref', NEON_AUTH_JWKS_URL: 'https://auth.example/jwks', NEON_AUTH_BASE_URL: 'https://auth.example' },
    })
    expect(response.status).toBe(401)
    expect(ai.run).not.toHaveBeenCalled()
  })

  it('sends a signed-in question and sourced PDSA/IFAB context through the Cloudflare AI Gateway binding', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256')
    const publicJwk = await exportJWK(publicKey)
    const kid = 'askref-test-key'
    Object.assign(publicJwk, { kid, alg: 'RS256', use: 'sig' })
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid })
      .setIssuer('https://auth.example')
      .setSubject('adult-referee-demo')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey)
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).includes('/jwks')
      ? new Response(JSON.stringify({ keys: [publicJwk] }), { headers: { 'content-type': 'application/json' } })
      : new Response('<html><nav>Navigation</nav><main><h1>Law 7</h1><p>IFAB periods of play.</p></main></html>', { headers: { 'content-type': 'text/html' } }))
    vi.stubGlobal('fetch', fetchMock)
    const ai = { run: vi.fn().mockResolvedValue({ response: JSON.stringify({ division: 'U8', explanation: 'U8 plays four 10-minute quarters.', citationIds: ['pdsa-law-7-duration'], restartType: 'none', placementId: null, recommendCoordinator: false }) }) }
    const response = await onRequestPost({
      request: new Request('https://example.test/api/askref', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ question: 'How long is a quater in U8?' }),
      }),
      env: {
        AI: ai,
        ASKREF_RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
        AI_GATEWAY_ID: 'playersmart-askref',
        NEON_AUTH_JWKS_URL: 'https://auth.example/jwks',
        NEON_AUTH_BASE_URL: 'https://auth.example',
      },
    })
    const body = await response.json() as { explanation: string; citations: Array<{ label: string; url?: string }> }
    expect(response.status).toBe(200)
    expect(body.explanation).toContain('four 10-minute quarters')
    expect(body.citations.some((source) => source.label.includes('Law 7'))).toBe(true)
    expect(ai.run).toHaveBeenCalledWith('@cf/meta/llama-3.2-3b-instruct', expect.objectContaining({
      messages: expect.arrayContaining([expect.objectContaining({ content: expect.stringContaining('RETRIEVED VERSIONED RULE EXCERPTS') })]),
      max_tokens: 500,
    }), { gateway: { id: 'playersmart-askref', skipCache: true } })
  })
})
