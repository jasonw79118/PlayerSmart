import { onRequestPost, type AskRefEnv } from '../functions/api/askref'

export default {
  async fetch(request: Request, env: AskRefEnv) {
    if (new URL(request.url).pathname !== '/api/askref') return new Response('Not found', { status: 404 })
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } })
    return onRequestPost({ request, env })
  },
}
