# Migration workflow

Apply migrations only to a disposable development Supabase project until the security review is complete. The current SQL is an initial reviewed design, not a tested production policy. Do not add actual player seed records.

Role assignment is purposefully absent from client grants. Bootstrap the first organization and administrator using a documented, audited server-only operation; do not temporarily expose a service-role key to make setup easier.

The Vitest migration checks are static guardrails only. They do not prove PostgreSQL RLS behavior. Add integration tests with separate authenticated Supabase users and multiple organizations before connecting client queries.
