# Product roadmap

## Phase 1 — Foundation (current)

- [x] Responsive React/TypeScript/Vite/Tailwind shell.
- [x] Fictional-only sample dashboard and U10 evaluation form.
- [x] U10 skill-specific rubric and weighted/incomplete score handling.
- [x] Prototype-only Supabase Auth sign-in gate (unconnected; not the backend decision).
- [x] Supabase-specific tenant/team/evaluation schema draft (reference only; not deployable to Neon as-is).
- [x] Link the PDSA-owned PlayerSmart Neon project to the `production` branch (Postgres only; no schema changes).
- [ ] Create an isolated development branch for schema and authorization work.
- [x] Select Neon Auth (Managed Better Auth) as target identity provider.
- [ ] Enable/test Neon Auth on the PDSA-owned Neon development branch and implement auditable server-side organization provisioning/API authorization.
- [ ] Port schema to Neon and test cross-organization/team/evaluator/role boundaries before any data connection.
- [ ] Authenticated membership resolution and real server-backed organization context.
- [ ] Implement referee-assigned ScoreBoard GameScore Card persistence, audited score updates, authenticated coach e-signoff, and locked finalization.
- [ ] Implement expiring/revocable guest access scoped to that day's published score projection only; test that player and evaluation data are never returned.
- [ ] Add scoped realtime score subscriptions; verify guest access cannot read other dates, games, rosters, or organization records.

## Phase 2 — Evaluations

Import review with manual/CSV alternatives, duplicate detection, human-reviewed OCR, configurable rubrics, authorized evaluator persistence, histories, comparisons, and private rankings. Do not send images containing youth data to an external processor without approval.

## Phase 3 — Draft

Configurable draft rules, inherited/protected players, pick transaction/audit, live synchronization, recommendation explanations, corrections, finalization, and expiring/revocable guest access with tests proving that coaches retain only their own development-board records.

## Phase 4 — Development

Coach-specific boards, two player-selected seasonal goals, coach-entered forms, secure one-player parent links, progress observations, comparisons, retention/deletion, and privacy review.

## Phase 5 — AskRef

Versioned PDSA-adopted rule sources; verified retrieval/citations; explicit uncertainty; non-AI lookup; accessible accurate SVG diagrams; independent rules endpoint. No model-memory-based rule answers.
