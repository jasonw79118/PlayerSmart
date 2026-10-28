# PlayerSmart

**Help every player reach their next level.** PlayerSmart is a separate, mobile-first youth-soccer evaluation and development application. The displayed name and organization branding are provisional.

## Current milestone: Phase 1 foundation preview

- React + TypeScript + Vite + Tailwind CSS frontend.
- Responsive workspace areas for Overview, Evaluations, Draft, My Team, Develop, Awards, Announcements, Admin, ScoreBoard, and AskRef.
- Fictional sample players across U8 Boys, U8 Girls, U10, U12, U14, and U18, plus test coach/assistant names and a 1–10 rubric with separate Listening and Attention categories.
- Evaluation clicks and draft preview state remain in memory and disappear on reload. They do not write player data anywhere.
- Batch evaluation uses a horizontally scrollable roster matrix with score dropdowns for first touch, dribbling, passing, shooting, movement, defending, awareness, decisions, positioning, listening, attention, alertness, and confidence. Division selector follows PDSA's published evaluation divisions: U8, U10, U12, U14, U18. U6 is excluded because PDSA specifies no evaluations for U6; its demo flow is team placement, not draft.
- Batch draft-preparation fields include draft eligibility, coach/assistant-coach child flags, linked-player relationship, and prior-season A/B/C grade. Evaluations and Draft are organized by head coaches; each head coach represents one team, with no separate team count. Fake test players, coaches, and assistants are seeded across all six divisions. Draft-tab Admin demo controls can arrange/randomize order and start/end a timed draft; selections assign to the coach's My Team roster.
- The Develop screen offers coach-facing drill ideas based on evaluation themes and athlete-entered goals, team-practice suggestions, and optional professional video-study examples. Professional athletes are observation references only, not comparisons or predictions. Drill activities are original summaries inspired by general practice-design principles; references: [RenderFoot](https://www.renderfoot.com/blog/soccer-drills) and [Elite Champions Coaching](https://elitechampionscoaching.com/drills/).
- My Team supports individual player scoring, two player-centered development goals, and dated periodic coach observations for games and practices. The coach assignment is shown separately from the player-chosen team nickname. The Awards board suggests end-of-season candidates only after a division’s evaluations are consolidated and a player has at least two reviews. It combines aggregate skill themes with observed effort, teamwork, sportsmanship, skill application, and feedback response. Suggestions are advisory; coach decisions remain human. Team scorelines are not treated as individual player performance, and this demo stores reviews in memory only.
- Admin has separate Coaches, Users & Access, Season, Announcements, and Archives menus. Coach setup separates adding head coaches, adding assistants, and assigning a division. Announcement files are local session previews only. User roles, archive access requests, and audit entries are prototype controls, not authorization. My Team allows editing the team nickname and selecting a named jersey palette; color names also appear on referee scorecards. One week after season end, the demo archives a snapshot and clears current roster/draft assignments while carrying player profiles and goals forward.
- Draft picks remain provisional until Admin ends the division draft; selections then flow into the selecting coaches’ My Team rosters. Coaches can trade players for 60 hours after the end time; later moves use Admin controls. The scheduled group evaluation opens by default and remains available after its scheduled date.
- Roster-import demo reads fictional CSV files in-browser and previews rows before adding session-only samples. Image import displays a local preview with manual transcription; it does not run OCR, upload, or persist image data.
- ScoreBoard demo includes a referee GameScore Card with coach-selected jersey-color swatches, match-day guest-score preview, match counters, coach demo sign-offs, and a final-score lock. State is in-memory only; guest preview is not authenticated, realtime, or safe for real match/player data.
- Neon Postgres and Neon Auth are enabled on the PDSA organization's `PlayerSmart` project, branch `production`. The React sign-in and self-registration screens use Neon Auth; the local Node API verifies Neon JWTs at `/api/me` and has a public, read-only `/api/health` check.
- The app requests `noindex, nofollow, noarchive` to discourage search-engine indexing. This is not access control: anyone with the URL can reach the sign-in/registration page.
- No player tables or player-data APIs have been deployed; successful authentication does not grant organization/team authorization.
- The `DATABASE_URL` and `DATABASE_URL_UNPOOLED` values are stored in ignored `.env.local`; only the server process reads them. The Vite client never receives database credentials.
- The Supabase migration is a reference-only artifact. It depends on Supabase Auth/RLS helpers and must not be applied to Neon as-is.
- AskRef sends questions to a server-side Cloudflare Pages Function, which grounds Cloudflare AI Gateway / Workers AI answers in the supplied PDSA 2025/2026 Issue 09 rulebook and fetches the relevant current IFAB Law page when available. Responses are cited explanations, not official rulings. Cloudflare account bindings and Neon Auth verification variables must be configured before the AI endpoint can run; no Cloudflare deployment is connected yet.

**This is not a production system.** Do not enter real youth information or select real registration exports/images. There is no PDSA endorsement, connection to PDSA systems, production player import, parent link, live draft, or production authorization setup. Do not access PDSA/Crossbar records or modify the separate PDSA website.

## Run locally

Requirements: Node.js 22.12+ (or 24+) and npm.

```sh
npm ci
npm run dev
```

With `VITE_NEON_AUTH_URL` blank the app opens in **fictional demo mode**. With the linked branch's Auth URL configured, the app uses the Neon Auth sign-in gate but still only displays fictional examples. Do not use real youth data. For a Neon-connected local run, keep the ignored `.env.local` created by Neon CLI; do not copy `.env.example` over it. Never put a database credential or other private secret in `VITE_*` variables.

For Neon-connected development, start Vite and the local API in separate terminals with `npm run dev` and `npm run dev:api`. The Overview page's **Check Neon connection** button tests the browser-to-Vite-proxy-to-Node-API-to-Neon path. The API currently binds to loopback and is not a production deployment.

```sh
npm test
npm run build
npm run preview
```

## Database foundation

The SQL at `supabase/migrations/202610270001_foundation.sql` is an unverified, Supabase-specific design reference for organizations, seasons, teams, players, season jersey assignments, events, and evaluations. It relies on Supabase Auth and `auth.uid()` RLS helpers, so it is **not a Neon migration**. Port the domain constraints to Neon/Postgres migrations and enforce identity, organization membership, coach assignments, evaluator access, and audited provisioning through a server-side API (or separately verified Postgres policies) before connecting any data. Jersey numbers remain separate, optional, and season-scoped.

No seed SQL is provided: creating organizations and assigning initial administrators requires an audited, server-side provisioning procedure. The UI examples are hard-coded fake data and are never synchronized to any backend.

Before adding player APIs or schema, use a development branch in the PDSA-owned Neon project and follow [`docs/SECURITY.md`](docs/SECURITY.md). Verify cross-organization, inactive membership, coach assignment, evaluator assignment, and role-escalation denial cases before any real data is considered. Do not use the existing Supabase migration as-is.

## Project layout

- `src/App.tsx` — responsive prototype and demo interactions.
- `src/lib/evaluation.ts` — U10 category rubric, anchors, and weighted-score calculation.
- `src/lib/neon-auth.ts` — Neon Auth client and JWT retrieval.
- `server/` — local Node API, Neon Postgres health check, and JWT-verification endpoint.
- `supabase/migrations/` — PostgreSQL schema, grants, helper functions, and RLS.
- `docs/` — architecture, security limits, and staged roadmap.

## Deployment status

GitHub Actions deploys the static preview from `main` to GitHub Pages; Cloudflare Pages is also deployed at https://playersmart-preview.pages.dev/. Cloudflare Pages has the Neon Auth verification URLs configured, but AskRef remains disabled until its AI Gateway and a supported rate limiter are provisioned. Neither static site hosts player records or production authorization. The app remains a fictional-data prototype. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) and [`docs/CLOUDFLARE_PAGES.md`](docs/CLOUDFLARE_PAGES.md).
