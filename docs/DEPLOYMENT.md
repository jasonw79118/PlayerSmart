# Setup and deployment guide

## Local development

1. Install Node.js 22.12+ (or 24+) and npm.
2. Run `npm ci`.
3. For the Neon integration, use the ignored `.env.local` created by `neon init`; never commit or print it. For offline demo mode, blank env values are sufficient.
4. Run `npm run dev` and `npm run dev:api` in separate terminals, then `npm test` and `npm run build`.

Neon Postgres and Neon Auth are enabled on the PDSA organization's PlayerSmart project on its `production` branch. The React client uses `VITE_NEON_AUTH_URL`; the local Node API verifies JWTs using server-side `NEON_AUTH_JWKS_URL`/`NEON_AUTH_BASE_URL` at `/api/me` and exposes a read-only `/api/health` check. No player schema/API or production API host is deployed. Never place a database URL or privileged credential in `VITE_*` variables.

The sign-in page includes public account registration and requests search engines not to index it. Before sharing a QR link, configure/verify email confirmation and abuse protections in Neon Auth. Do not treat the QR or `noindex` as a security boundary; a new account has no organization authorization, and the current app still shows fictional demo data only.

## Supabase-specific schema draft (reference only)

`supabase/migrations/202610270001_foundation.sql` contains Supabase-specific `auth.uid()` and RLS helpers. Do not apply it as a Neon migration. Port and review the schema for Neon, enable and verify Neon Auth, build server-side authorization and provisioning, then test on a development branch owned by the PDSA Neon organization. No first-admin provisioning or sample SQL is included.

The current migration is an initial design, not independently certified policy, and is not the target backend implementation. Execute adversarial authorization tests before connection to any persistent player data.

## Hosting

Cloudflare Pages static-preview configuration is in [`CLOUDFLARE_PAGES.md`](CLOUDFLARE_PAGES.md) and `wrangler.toml`; no account, domain, repository connection, or deployment is configured. The local health API is not production hosted. A static `dist/` deployment does not include the API; select and secure a production server runtime (or authorize Neon Functions) before wiring private data. Avoid real data until the security review gates in `SECURITY.md` pass.
