# VS Code handoff: PlayerSmart and Cloudflare

> Local AskRef implementation update (2026-10-28): Qwen3, 278 draft scenarios, approval snapshots, private draft-queue support and a separate rate-limited Worker are implemented. See [ASKREF.md](ASKREF.md). No Cloudflare account activation or deployment is implied; the deployment snapshot below remains historical.

This note records the current deployment state and the remaining AskRef work. It contains no credentials or secret values.

## Project locations

- Local repository: `C:\Users\jason\PlayerSmart`
- Git remote: `https://github.com/jasonw79118/PlayerSmart.git`
- Default branch: `main`
- Cloudflare Pages project: `playersmart-preview`
- Cloudflare Pages URL: <https://playersmart-preview.pages.dev/>
- Latest production deployment at handoff: `406ec8e7-cadd-4948-abf2-043b6b57dc83` (source commit `03a36ef`)

The GitHub Pages version is also live at <https://jasonw79118.github.io/PlayerSmart/>. GitHub Actions builds and deploys that static preview. Cloudflare Pages is currently deployed manually with Wrangler; it is not connected to GitHub for automatic builds.

## What is already configured

- GitHub commits through `03a36ef` are pushed to `origin/main`; the worktree was clean at handoff.
- GitHub Pages workflow builds the Vite output and deploys it under `/PlayerSmart/`.
- The Cloudflare Pages project exists, has production branch `main`, and serves the app at the URL above.
- Wrangler is installed in the project. `npx wrangler whoami` reports the Cloudflare account associated with `jasonw79118@gmail.com`.
- `NEON_AUTH_JWKS_URL` and `NEON_AUTH_BASE_URL` are stored as Cloudflare Pages production secrets. Their values were sourced from the ignored local `.env.local`; do not copy them into Git or print them.
- The client bundle is built with `VITE_NEON_AUTH_URL` from local `.env.local`. The Cloudflare page displays the sign-in screen and had no browser console errors when checked.
- Pages Functions are deployed at `/api/me` and `/api/askref`. An anonymous request to `/api/me` returning 401 is expected.
- The Workers AI binding named `AI` and `AI_GATEWAY_ID=playersmart-askref` are declared in `wrangler.toml`.

## Why AskRef is not active yet

AskRef deliberately fails closed until **both** AI Gateway and rate limiting are ready. Do not remove this protection or expose Workers AI directly to anonymous requests.

1. **AI Gateway:** The code calls `@cf/meta/llama-3.2-3b-instruct` through Gateway ID `playersmart-askref`. That Gateway has not been created/configured. An attempt to list it using the current Wrangler OAuth token returned Cloudflare API authentication error `10000`. The Wrangler token reports account read/pages write/AI write, but Wrangler also warned some OAuth scopes are missing. Gateway setup may need Cloudflare Dashboard access or a refreshed token/API token with the appropriate AI Gateway permissions.
2. **Rate limiting:** `functions/api/askref.ts` requires `ASKREF_RATE_LIMITER` and returns 503 if the binding is absent. Cloudflare Pages project configuration rejected `[[ratelimits]]` in `wrangler.toml` (`Configuration file for Pages projects does not support "ratelimits"`), so the placeholder binding was removed. Do not put it back into Pages config and assume it works.
3. **Architecture decision needed:** Configure an account-supported rate limit for the API hostname, or move `/api/askref` behind a Cloudflare Worker that supports the Workers Rate Limiting binding. Keep the endpoint unavailable until an effective server-side limit is verified. A per-isolate in-memory counter is not an adequate substitute.
4. **Auth origin:** Before using sign-in on `playersmart-preview.pages.dev`, verify that the Neon Auth trusted-domain/CORS configuration permits this origin. Do not use real user/player data during testing.

The Pages deployment succeeding means the UI and Function bundle are published; it does **not** mean AskRef inference is operational. No youth/player records should ever be sent to the model. The handler only sends the question plus retrieved rules excerpts.

## AskRef implementation overview

- `functions/api/askref.ts`: verifies Neon Auth JWTs; retrieves versioned PDSA excerpts and relevant IFAB 2025/26 pages; calls the named Workers AI model through the Gateway; filters model citations through retrieved source IDs; returns division, explanation, citation list, placement, and coordinator recommendation.
- `functions/_shared/auth.ts`: JWT/JWKS verification shared by Pages Functions.
- `src/lib/pdsa-rules.ts`: bundled PDSA 2025/2026 Issue 09 excerpts and IFAB links.
- `src/lib/verified-restart-placements.ts`: fixed server-side restart placement allowlist. The model selects an ID, not free-form placement instructions.
- `public/askref-diagrams/*.svg`: static restart diagrams; the model does not generate SVG.
- `functions/api/askref.test.ts`: server handler tests.
- `wrangler.toml`: Pages output, AI binding, and Gateway ID variable.
- `docs/CLOUDFLARE_PAGES.md`: deployment and security notes.

## Start in VS Code

1. Open the repository folder `C:\Users\jason\PlayerSmart`.
2. In the integrated terminal run:

   ```powershell
   npm ci
   npm test -- --reporter=dot --maxWorkers=1
   npm run build
   ```

3. For the local frontend, use `npm run dev`. This does not run Cloudflare Pages Functions; AskRef requests need the Pages dev runtime.
4. Do not overwrite `.env.local`. It is ignored and contains local configuration. Never commit it or put private values in `VITE_*` variables.
5. Before deploying changes to the existing Cloudflare project, run `npm run deploy:pages`. This builds and deploys `dist/` to the production `playersmart-preview` project. Confirm the target before running deployment commands.

## Recommended next steps

1. In Cloudflare Dashboard, verify the account and Pages project's bindings/environment settings without revealing secrets.
2. Create/configure AI Gateway `playersmart-askref` with approved billing, caching, privacy/logging, and abuse controls. Avoid prompt/response logs containing user-entered data.
3. Choose and implement an effective Cloudflare rate-limiting design that works with Pages, or move the API to a Worker with a supported rate-limit binding. Add automated tests for limit behavior before enabling inference.
4. Set any required production bindings/secrets using the Cloudflare dashboard or Wrangler secret commands; never check them into the repo.
5. Verify Neon Auth trusted domains for the Pages origin; test only with a controlled test account.
6. Run the complete test/build suite, deploy, and verify `/api/me`, anonymous rejection, AskRef authorization, rate-limit response, source citations, and restart diagrams. Confirm unsupported rules lead to a coordinator recommendation.

## Last verification

- `npm test -- --reporter=dot --maxWorkers=1`: 48 tests passed.
- `npm run build`: succeeded (existing dependency annotation and bundle-size warnings only).
- Cloudflare Pages deployment completed successfully; sign-in screen rendered with no browser console errors.
- Anonymous `/api/me` and `/api/askref` requests returned 401, as expected.
- AskRef is **not** ready for real use until Gateway, rate limiting, and auth-origin checks are completed.
