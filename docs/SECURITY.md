# Security notes and review gates

PlayerSmart is intended for data about minors. This preview is **not approved for real player information** and does not claim COPPA or other legal compliance.

## Implemented in the foundation

- Neon Postgres is linked to the PDSA organization's PlayerSmart project on `production`. Only a local, read-only database health endpoint is wired; do not treat this as authorization for player-data access.
- `.env.local` contains the ignored server-side connection strings. The browser calls only the local `/api/health` endpoint and never receives database credentials.
- Neon Auth is enabled on the linked branch and the browser uses its public Auth base URL for sign-in. The local API verifies tokens with the branch's JWKS and expected issuer on `/api/me`. The migration remains Supabase-specific and is not approved for direct use on Neon.
- Public self-registration is available through Neon Auth. A new account is an identity only and receives no PDSA/Techform organization role, team assignment, or player-data authorization. Configure email verification and abuse protections in Neon Auth before distributing the QR code. `noindex` metadata discourages indexing but does not make the URL private or restrict access.
- Current UI uses fabricated local state and has no player-data API.
- No real players, secrets, or database connection credentials are seeded into the project.

## Important gaps — do not use with real youth records

- The React app still renders fictional hard-coded data after Neon Auth sign-in and does not fetch authorization roles or real organization records. Authentication alone is not authorization.
- No audited server-side organization/user provisioning, administrator approval, request rate-limiting, or operational audit log exists yet.
- Draft guest sessions, parent goal links, uploads, data retention/deletion, export controls, and emergency/incident workflows are not implemented.
- ScoreBoard guest preview is not authenticated/realtime and must remain fictional. Production guest access needs a short-lived/revocable day-scoped grant; referee writes need assignment checks; coach signatures and finalization need an audit trail.
- Neon schema/API authorization has not been implemented or tested. Do not rely on the current Supabase RLS draft to protect a Neon database.
- No privacy notice, parental consent workflow, legal review, security incident response plan, or organizational approval exists.

## Before production

1. Obtain organizational approval and legal/privacy review, including parental consent, retention, deletion, and breach response.
2. Create/use an isolated development branch for schema and auth work; do not make player-data schema changes on `production`. Neon Auth is not yet enabled in this project; enable and test it only after organizational authorization.
3. Implement and adversarially test the Neon schema/API boundary for two organizations, two coaches, manager, inactive/revoked membership, evaluator assignment changes, cross-event access, and attempted role elevation. The Supabase migration is reference-only and must be ported/reviewed first.
4. Add audit events for membership, roster, evaluation, draft, exports, guest revocation, and goal-link lifecycle. Ensure log payloads exclude unnecessary child data.
5. Add server-side provisioning and sensitive operations; never send database credentials or privileged keys to a browser.
6. Review authentication email/reset policy, session duration, rate limits, storage access, backups, deletion semantics, and secrets scanning.
7. Complete accessibility review and obtain written approval before any real youth data is entered.
