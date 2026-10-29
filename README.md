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
- AskRef sends questions to a server-side Cloudflare Pages Function, which grounds Qwen3 / Cloudflare Workers AI answers in the supplied PDSA 2025/2026 Issue 09 rulebook and fetches the relevant current IFAB Law page when available. Responses are cited explanations, not official rulings. AskRef now includes 278 source-linked draft scenarios behind the scenes, division inference from questions, conversational clarification, evidence inspection and an approval-gated answer bank. See [docs/ASKREF.md](docs/ASKREF.md). Its Worker/service binding, Gateway and optional review queue still need account configuration and deployment.

**This is not a production system.** Do not enter real youth information or select real registration exports/images. There is no PDSA endorsement, connection to PDSA systems, production player import, parent link, live draft, or production authorization setup. Do not access PDSA/Crossbar records or modify the separate PDSA website.

## Run locally

Requirements: Node.js 22.12+ (or 24+) and npm.

```sh
npm ci
npm run dev
```

With `VITE_NEON_AUTH_URL` blank the app opens in **fictional demo mode**. With the linked branch's Auth URL configured, the app uses the Neon Auth sign-in gate but still only displays fictional examples. Do not use real youth data. For a Neon-connected local run, keep the ignored `.env.local` created by Neon CLI; do not copy `.env.example` over it. Never put a database credential or other private secret in `VITE_*` variables.

For Neon-connected development, start Vite and the local API in separate terminals with `npm run dev` and `npm run dev:api`. The Overview page's **Check Neon connection** button tests the browser-to-Vite-proxy-to-Node-API-to-Neon path. The API currently binds to loopback and is not a production deployment.

Open the local app at `http://localhost:5173`. Neon Auth accepts this origin; sign-in from `http://127.0.0.1:5173` is rejected with `INVALID_ORIGIN`. Vite redirects browser visits from that numeric address to `localhost`, preserving the path and query string.

```sh
npm test
npm run build
npm run preview
```

The local development site starts with **5 coaches and 30 fully evaluated,
unassigned players per division** (180 players across U8 Boys, U8 Girls, U10,
U12, U14 and U18). Use the main **Draft** workspace to run six snake-draft rounds
and assign six players to each coach. The local **Reset draft test data** button
replaces all local rosters and clears draft progress; end the active draft before
resetting. The local development draft now persists across refreshes and shares
updates through the local development server, including separate browser profiles. This loading behavior
and reset control are limited to development; no database records are changed.

Athlete rosters, evaluation tables, general player selectors and assignment
boards use last-name alphabetical order, then first name for ties. Existing
scores, grades, evaluation numbers and picks are unchanged. Explicit draft
recommendations and coach preference queues keep their ranked order; pick
history remains chronological.

**Eval # follows last-name alphabetical order within each division's full roster.**
The first athlete is #1, the second #2, and so on. Imports update this alphabetical
numbering; filtering, evaluation scores and draft selections do not change it.
Duplicate names within a division are skipped. Eval # remains separate from the
season jersey number.

Administrators use **Coach view** to preview a coach's picks and live draft roster
while retaining their administrator role. Preview controls, **Back to
administrator**, the coach selector and comparison walkthrough are available to
administrators only. Coaches see their own draft screen without administrator
navigation or a role selector.
Each coach has an independent ranked board: prioritized choices appear first,
with the remaining available players in evaluation order. Move preferences up
or down; when another coach drafts a choice, it leaves the available board and
the next preference moves up. Planning never commits a pick. Returning from an
administrator preview keeps draft progress and preferences, including from My Team.
After recording a pick, **View latest pick's team** opens the receiving coach's
updated roster. Local draft views share the same development workspace.

Two local test profiles open directly without changing the administrator's
sign-in session:

- [Coach John Test](http://localhost:5173/?testAccount=coach-john-test): U10
  Evaluations, draft preferences, live roster and My Team. Evaluations shows all
  30 U10 players with John as the fixed evaluator. Participant setup, roster import
  and consolidation stay with the administrator. John is one of the five U10 coaches.
- [Ref Chris James](http://localhost:5173/?testAccount=ref-chris-james): Referee
  tools and GameCard. The test match cards list Chris as the referee.

The referee workspace opens at **RefHome** with three large buttons: **AskRef**,
**GameCard** and **ScoreBoard**. It has no sidebar, workspace top bar or footer;
the light/dark toggle remains available. Each tool has **Back to RefHome**.
GameCard records scores and coach signatures; ScoreBoard shows the day's scores
without editing controls. Returning home preserves match and chat state.

Keep the administrator at `http://localhost:5173/` and open the profile links in
separate tabs or browser profiles connected to that same development server.
Picks, rosters, evaluation points and match cards update through server events,
with refresh checks on focus, reconnection and every two seconds. Browser storage
is a cache; the local development server is authoritative. Existing administrator
data initializes an empty server without replacing saved picks. Local fixtures
persist in the ignored `.playersmart-draft.local` file across server restarts.
Identity and navigation stay separate per tab. John stays on his U10 team.
Use **Reset draft test data** to clear draft progress. These are local
test profiles, not Neon sign-in accounts. They work only on loopback development
URLs, never on the deployed build, and do not borrow the administrator's Auth
session. Rulebook lookups work; live authenticated AI requests require a regular
sign-in. Cross-device synchronization and production role provisioning remain
unimplemented.

GameCard coach confirmations include a finger, stylus or mouse signature pad.
The coach's name loads automatically from the assigned coach on the card;
update the team details to correct a name. Draw a signature, then confirm the score. Clear a drawing
to retry before confirming. Signed drawings remain visible on the card; changing
match details clears both drawings and confirmations. Both drawn signatures are
required before finalization. Signature strokes share the same local test match
state across tabs through the local test server and are not uploaded to a signing service.

Player division, letter grade and evaluation points follow each player into
the coach draft roster and My Team. Team evaluation shows the average of complete
numeric player scores, total points, evaluated-player count and grade mix.
The administrator's live team-balance table compares every coach in the division,
including differences from the division average and the highest-to-lowest team
average gap. Empty rosters have no average; incomplete scores are excluded and
partial averages are labeled provisional. Roster counts remain visible while
draft rounds are incomplete. No automatic balance threshold is assumed.

The **Draft → Compare participant views** walkthrough shows one U10 draft with
five coaches, 40 players and eight selections per team. It opens before pick one.
The administrator arranges coach order, starts the draft, chooses the current
coach's selected player and records that pick. Everyone sees the assigned team,
latest pick, updated available pool and next coach; the shared 40-player board
keeps assigned rows visible with team and pick number. Compare all six views or
switch to one participant. Pause to enable the optional coach-confirmed entry
mode. Shortlists and notes belong to each coach's individual view. Pause/resume,
undo while paused, clock reset and draft reset are available. **Run next 5 picks**
advances the walkthrough using evaluation order so all eight rounds can be tried.
Snake order reverses each round: 1–2–3–4–5, then 5–4–3–2–1. The coach at each end
gets consecutive picks when the direction changes. This is a shared local walkthrough in one
browser; separate authenticated participant sessions and cross-device sync are
not connected by this feature. Returning to the draft workspace leaves its
existing draft state separate from the walkthrough.

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

## AskRef volunteer-referee preview

AskRef uses Qwen3 as its only model, with PDSA rules first and the adopted IFAB edition for gaps. The 278 internal scenarios cover questions from coaches, players and parents, including short wording a young referee can use. The referee sees a chat with message history, one composer for questions and follow-ups, expandable citations, restart diagrams, and New chat. The question bank and division selectors stay off the screen. Starter answers are drafts pending coordinator review against the original rulebook. Only specifically approved, source-current scenarios are reused without inference; new answers remain review drafts. No model fine-tuning or official approval is implied. Setup, review commands and remaining activation steps are in [docs/ASKREF.md](docs/ASKREF.md).

Simple AskRef timing questions now return only the requested division's match length and breaks, directly from the bundled PDSA summaries, including in local demo mode. Broader AI explanations still require Cloudflare activation. Backup search excerpts are collapsed and are not presented as AI answers.

Basic goal-kick definitions and U6/U8 placement questions also use the bundled PDSA summary directly, with citations and the placement diagram. Placement questions without a division ask for clarification. Empty or non-JSON API failures display a readable service-unavailable message.

In **Evaluations**, Admin selects the age division, sets the number of teams, and selects one head coach per team from the club list. Team setup locks once that division draft starts. **Admin → Coaches** maintains the head-coach list. Head coaches select or add their assistant in **My Team**. **Admin → Coaches** displays each assigned assistant and lets Admin record or revoke club background-check verification for both head and assistant coaches. A fall check covers that fall and the following spring; each new fall requires a fresh check before the coach's first practice. Admin records the conducted date and the team's first-practice date; checks conducted after that date are flagged for club review. Earlier verification entries without a conducted date must be reconfirmed. Coaches see the status but cannot verify themselves; this records a manual review of club records. Local test profiles share these settings across tabs.

**Admin → Schedule** shows division tabs for U6, U8 Boys, U8 Girls, U10, U12, U14 and U18 directly above Division Matches, using the head coaches selected in Evaluations. Each division independently saves its first/last dates, ordered priority weekdays, days to avoid, kickoff windows or explicit kickoff times, fields, turnaround, rest time, games per team per day, minimum calendar days between team matches, repeated opponent cycles, and unavailable dates. Weather controls also keep their division context. PDSA Law 7 sets the field booking length including breaks: U6 41 minutes, U8 49 minutes, U10 55 minutes, U12/U14/U18 65 minutes. Extra field turnaround and minimum days between games are Admin scheduling preferences. U6 can be set up and imported through Evaluations; existing persisted player/division IDs are preserved.

Choose a **Primary match day**, then add and order any **Alternative priority days** explicitly. The planner tries primary dates first across the selected date range, then the listed alternatives in order. **Days to avoid completely** are hard exclusions for generation, replacement suggestions and revisions. New division settings start with Wednesday and Sunday avoided; Admin may change them. No other weekdays are added automatically. Legacy selected weekdays retain their existing choices until edited.

**Admin → Fields** follows the club-supplied PDSA map: U6 fields **3, 4, 5**; U8 **7A, 6, 7**; U10 **1A, 1, 2**; U12/U14/U18 share **8**. A fields are distinct pitches. Admin can close a field, restrict recurring open hours and dates, exclude whole dates, and enter dated partial-day closures with reasons. Restrictions apply globally to every division sharing the field. Without restricted windows an active field uses the division's schedule hours. The complete match must fit availability; existing fixtures that become unavailable are flagged for review and can be replanned. Practice areas are not match fields.

Coach rest and referee rest are separate division settings. Older saved schedules retain their previous shared value until each field is edited. New field bookings retain both rest values so fixtures in another division respect the rest time already reserved for the assigned people.

**Admin → Referees** stores each official's full name, phone, email, preferred contact method (text, phone call or email), active status, divisions, weekly availability windows, date limits, unavailable dates and scheduling notes. No availability is assumed for a new record. New and revised schedule previews assign available referees where possible and identify uncovered fixtures. **Assign available referees** fills existing unplayed fixtures; individual rows also allow an eligible referee to be selected. Assignments take effect only when the preview is applied. Availability must cover the entire match, including PDSA breaks; bookings, rest and coaching conflicts are checked across divisions. Contact information stays in the Admin directory; recording a contact preference does not send a message.

Referees use the same annual background-check policy as coaches: one verified fall check covers that fall and the following spring, and a new check is required each fall before first practice or duty. Admin records checks by fall year and the first duty date in the referee record, then saves it. Unverified, revoked, future-dated, prior-cycle or late checks cannot qualify a referee for assignment. Managed GameCards require a currently cleared assigned referee before recording play, and their referee name comes from the Admin assignment. **Admin → Season** configures the annual fall renewal month/day (initially August 1, matching the existing fall start); the year follows the activity date. The old unrestricted Season date/referee editor has been replaced by a link to the validated scheduler.

Generation and revisions show a reviewable preview. A schedule is applied only when every proposed match fits, and stale previews are rejected. Field, coach/assistant, assigned referee, rest and daily-team constraints include fixtures already scheduled in other divisions. Unknown legacy field assignments conservatively reserve all fields during their match. This is a deterministic planner; if it cannot fit all fixtures, expand the parameters and rebuild.

Cancel or postpone a fixture with a reason to get suggested replacement slots. A division-day closure postpones that division's unplayed fixtures and blocks the date. **Rework remaining schedule** can move the division's future unplayed fixtures to fit the new availability; other divisions and scorecards with recorded play remain fixed. Cancelled games remain cancelled unless selected for a replacement. Changes retain their prior slot and reason in a history. Coaches see their fixtures in My Team, and active fixtures populate referee GameCards and ScoreBoard. Local test profiles share schedule settings and matches through the development workspace service; this does not publish a calendar or send notifications.
