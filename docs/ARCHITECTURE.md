# Architecture (Phase 1)

## Trust boundaries

1. The React/Vite client is untrusted. UI state and filtering are usability features only.
2. Target data service is Neon Postgres in a project owned by the PDSA Neon organization. PlayerSmart remains a separate application, schema, and authorization boundary; this does not connect it to the PDSA public website, Crossbar, or unrelated PDSA records.
3. The browser must call a server-side API/Neon Function for private records. The server verifies adult identity, active organization membership, role, team assignment, and operation scope on every request. Never expose a database URL or privileged key to the browser. Database policy design must be tested independently; Supabase `auth.uid()` policies do not work as-is on Neon.
4. Organization membership/role provisioning is reserved for a future audited server-side operation. The browser has no membership write grant.
5. Identity provider is Neon Auth (Managed Better Auth), enabled on the linked branch and wired to the React sign-in gate. The Supabase-specific SQL migration remains a reference artifact, not the deployed Neon schema. The API must verify identity and separately authorize organization/team scope; authentication alone grants no data access.
6. Service credentials, database credentials, OCR input, and AI provider secrets must never enter the client bundle.

## Initial data model

The domain model is organization-scoped: organization memberships carry organization-local roles; seasons, teams, players, and evaluation records carry organization ownership. A coach sees only players linked to a currently assigned team. Managers may see unassigned players for authorized roster/draft setup. Evaluators are explicitly assigned per event and event players are explicitly allow-listed; an evaluator cannot create a rating for an arbitrary organization player. The current Supabase migration sketches this model but is not directly deployable on Neon.

Evaluation reference numbers and playing-season jersey numbers are different fields. `season_roster_assignments` stores an optional jersey number scoped to organization + season + team + player. It does not copy a number from evaluation data; coaches/admins may set it after the player is assigned, and changing it in a later season does not rewrite earlier season assignments. Duplicate jersey numbers are blocked within one team/season. Coaches can read and update assignments only for their active team; managers can manage their organization's assignments.

Platform administrator access is not implemented. Even a future platform operator must not gain default access to all private player rows. Role elevation, guest draft sessions, audit history, and secret-bearing edge functions are future server-side work, not client toggles.

## RLS helper functions

The current migration's `SECURITY DEFINER` helpers use Supabase's `auth.uid()` and the Supabase `authenticated` role. They are reference-only. The Neon implementation must bind the verified actor identity in the server/API layer (or use a separately designed, verified database authorization mechanism), test every authorization boundary, and never trust organization or role claims supplied by the browser.

## Phase boundaries

The current UI intentionally uses local React state and fabricated records. Local `/api/health` performs only a read-only connection check; `/api/me` verifies Neon Auth JWT signature/issuer and returns no private records. No player tables or data API exists. Authentication and JWT verification are not organization authorization. Next steps: create a development branch; port the domain schema; then implement server-authorized organization context and assigned-coach-only reads/writes. No real data until adversarial authorization tests pass.

## ScoreBoard boundaries

ScoreBoard is a referee-facing GameScore Card plus a guest score view. A production referee mutation must require a verified referee assignment for that game; score edits and finalization must be audited. Coach sign-off must record the authenticated coach identity and timestamp for each side, and any score correction must invalidate prior sign-offs or use a controlled correction workflow. Finalization locks normal score edits; corrections require an explicit audited reopen/amend action.

Guest access is read-only and scoped server-side to the published scores for one authorized game day. The guest API must not return player names, rosters, evaluation scores, coach contact details, or other private records. Use a short-lived/revocable guest session/token and a server-derived date scope; never trust a date or game ID from the client as authorization. Realtime updates must subscribe only to this safe score projection and preserve the same scope for every event. The current ScoreBoard UI is a same-browser in-memory simulation, not guest authentication or realtime transport.
