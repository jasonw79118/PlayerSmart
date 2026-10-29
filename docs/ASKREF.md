# AskRef: Qwen3 and a reviewed answer bank

AskRef is designed for young volunteer referees with limited match experience,
and for coaches, players and parents checking the same rules. It uses one model:
`@cf/qwen/qwen3-30b-a3b-fp8` on Cloudflare Workers AI. There is no second-model fallback.

## Authority order

PDSA rules always control. The adopted IFAB edition fills gaps only where PDSA is silent; an IFAB rule or exception cannot waive an explicit PDSA requirement. Question banks, teaching guides, prior chat messages and generated explanations are lower-priority aids, never authority. Known local conflicts are checked in direct responses, approved-bank eligibility and generated responses. Relevant model answers must cite the applicable PDSA sources. Approval snapshots include this authority policy. Ambiguous local applications go to the Referee Coordinator. These checks target known modifications and do not prove every possible interpretation.

## What is implemented

Simple match-duration questions use a division-specific rulebook lookup before inference. This works in the local fictional-data preview without an AI connection. It checks its statements against the bundled source, recognizes common timing misspellings, asks for a missing division and handles timing follow-ups. These are direct source-derived facts, not newly generated or coordinator-approved answers. Qwen handles broader questions when configured. Goal-kick definitions and U6/U8 placement, throw-in placement and mulligans, offside explanations, field areas, goalkeeper handling restrictions, cards, direct/indirect kicks and timing-policy questions also have direct lookups. The catalog recognizes listed natural variants and common spellings such as mullegans, off-sides and in-direct. It asks for a division when needed, uses PDSA modifications before pinned IFAB summaries, and leaves specific incident decisions for further context. The clock answer distinguishes no added time from a complete stopwatch policy, which the bundled PDSA summary does not establish.


- 278 starter scenarios with alternate natural questions from coaches, players and
  parents. Each has division eligibility, a short draft answer, calm suggested
  wording and supporting PDSA/IFAB summary IDs. Topics include time, equipment,
  substitutions, offside, goal-box exceptions, fouls, restarts, weather, tournament
  overtime, phone replays and sideline pressure. Some scenarios deliberately ask
  for more facts or the full IFAB procedure instead of supplying an unsupported call.
- A chat interface with user/assistant message history, a multiline composer, Enter to send, Shift+Enter for a new line, a checking indicator, retry and New chat. Conversation stays in this app session, including while navigating to another tab. The scenario bank stays behind the scenes; no question-bank list or division selector is displayed.
- Approved-answer lookup before model calls. Reuse requires an exact normalized
  known question variant, a matching division, and exactly one eligible approved
  entry. A negation, extra fact or different age group does not silently receive
  the nearest saved answer. Broader language goes through source retrieval/Qwen.
- Qwen is instructed to answer only the requested division and the specific question. Replies that unnecessarily introduce other divisions are rejected. Backup rulebook search is collapsed and explicitly labeled as source text, not an AI answer.
- Qwen answers use PDSA modifications first and retrieved, edition-specific IFAB
  text for gaps. The model supplies cited IDs and exact supporting snippets.
  The server validates schema, division, citation existence and snippet presence.
  These checks do not prove that a rule was interpreted correctly.
- Division is inferred from explicit wording such as U8, U-8, under eight or 8U. Player age alone is not treated as a division. General rules can be answered without asking for a division.
- Clarifying questions and ordinary follow-ups use the same chat composer. Up to six recent complete exchanges (10,000 characters) are sent as context; older messages remain visible. A short reply such as U8 or 8 is understood when division was asked. New chat clears the conversation and cancels the pending browser request. Previous assistant text is conversational context, never rule evidence.
- Fixed restart placements and diagrams. New model answers never add diagrams.
- A Worker entry point with a supported 10-requests/minute per-subject limiter.
  Missing/broken throttling prevents new inference. Approved bank answers can be
  returned without model configuration or inference quota.
- Optional private KV draft queue with 30-day expiry. Drafts never enter the
  reusable bank automatically. Queue status is returned by the API for reviewer tooling; the referee screen does not expose review-queue controls. The queue omits raw questions and user identifiers,
  but generated text may still reflect user input. Do not enter personal details.

The supplied young-referee training guide adds 75 questions and conditional teaching responses. Its rule claims are checked against the configured sources; unverified weather thresholds and missing local procedures are flagged. See [training guide integration notes](ASKREF_TRAINING_GUIDE.md).

The expanded guide adds questions 76?175, alternate wording, and restart/location/discipline details. Original-PDF checks resolved goalkeeper use, kick-in procedure, substitution windows and the injury-clock rule. The 2026/27 countdown remains inactive pending adoption. See [expanded guide notes](ASKREF_EXPANDED_TRAINING.md).

## Rule and approval status

The repository contains **PDSA 2025/2026 Issue 09 (02/2026) summaries** and now a checked copy of the original public PDF in `docs/sources/`. Selected local procedures were corrected against that PDF; source checks are separate from coordinator answer approval. The fallback IFAB edition is **2025/26**. These are pinned
competition editions, not a claim that they are today's latest editions. Confirm
the editions adopted for the season before live use.

All 278 starter answers are **editorial drafts**, not PDSA/Referee Coordinator
approved. `src/lib/askref-approvals.json` is intentionally empty. They are available in the exported coordinator review pack, but are hidden from the referee interface and cannot be automatically returned as approved bank answers yet. A coordinator must still review the answers for approval. Selected PDF text was checked on 2026-10-29; official endorsement and full visual verification are not claimed.

Approval snapshots include the complete scenario, rule editions, diagram
placement and cited source text. Changing these invalidates approval until the
review is repeated. IFAB bank excerpts live in `askref-ifab-sources.json`; changing
an excerpt also invalidates affected approvals. A current live page is fetched
for new AI questions, not automatically copied into the approved bank.

## Review and grow the bank

Export all questions, draft answers and evidence for a coordinator:

```powershell
npm run askref:review -- export docs/askref-review-pack.json
```

After the named reviewer checks the **original adopted documents**, that reviewer
can record approval for one specific scenario:

```powershell
npm run askref:review -- approve u8-duration --reviewer "Reviewer name" --date YYYY-MM-DD --checked-originals
```

This is a local repository review record, not an authorization system or a way
for the Admin demo to grant itself official approval. Inspect and commit the
diff, run tests/build and redeploy to publish the updated bank. Never bulk-approve
unread drafts. The scenario collection also acts as the starting evaluation set;
it does not fine-tune model weights.

For a useful new generated answer, a reviewer first curates a JSON packet. Keep
only a factual, anonymous situation; specify all conditions that affect the call.
Use the same shape as the exported scenarios:

```json
{
  "scenario": {
    "id": "unique-scenario-id",
    "audience": "Coach",
    "topic": "Restarts",
    "divisions": ["U8"],
    "questions": ["A complete question with the relevant facts?", "A second equivalent wording?"],
    "answer": "Reviewed draft answer grounded in the cited text.",
    "sayToThem": "One calm, simple sentence.",
    "sourceIds": ["pdsa-law-15-throw-in"]
  },
  "sources": []
}
```

Add any needed **official, adopted-edition IFAB excerpts** in `sources`, with
`id`, `text`, `edition`, `authority`, `version`, `label` and `url`. For this edition,
IDs use `IFAB-2025-26-LAW-N`, authority is `IFAB`, edition/version are `2025/26`,
and URLs must be `https://www.theifab.com/laws/2025-26/<law-slug>/`.
Do not label PDSA summaries as original quotations. Do not add external football
blogs or general model knowledge to the evidence.

```powershell
npm run askref:review -- import path/to/curated-packet.json
```

Import creates a draft in `askref-extra-scenarios.json`. Review originals and run
`approve` separately. A downloaded raw AI answer is intentionally not accepted
as a ready-approved scenario. Human curation supplies the exact situation and
equivalent question variants. Unsupported measurements/procedures remain omitted.

## Cloudflare activation

These changes are local implementation. The existing Pages deployment is not
updated by editing the repository. The handoff's Gateway and limiter issues have
not been claimed resolved in the Cloudflare account.

1. Create/verify the `playersmart-askref` AI Gateway in the intended account. Turn
   off prompt/response content logging. Keep existing authentication checks.
2. Use `wrangler.askref.toml` to deploy the `playersmart-askref` Worker. Set its
   `NEON_AUTH_JWKS_URL` and `NEON_AUTH_BASE_URL` secrets from the existing trusted
   configuration, without printing or committing them. The Worker has no public
   workers.dev route; Pages accesses it through a service binding.
3. Create a Workers KV namespace for drafts, then add the returned namespace ID:

   ```powershell
   npx wrangler kv namespace create ASKREF_REVIEW_QUEUE --config wrangler.askref.toml
   ```

   ```toml
   [[kv_namespaces]]
   binding = "ASKREF_REVIEW_QUEUE"
   id = "<returned namespace ID>"
   ```

4. Verify the Free plan/account billing setting. This repository does not enable
   paid inference or purchase credits. Free quota is shared; model calls can stop
   when it is used up. The per-user limiter is abuse control, not a globally exact
   daily budget counter. Bank lookup itself uses no inference.
5. Validate and deploy the Worker, then uncomment `ASKREF_WORKER` in
   `wrangler.toml` and redeploy Pages. Do not put `[[ratelimits]]` in Pages config.

   ```powershell
   npm run check:askref-worker
   npx wrangler deploy --config wrangler.askref.toml
   npm run deploy:pages
   ```

6. Verify Neon Auth permits the Pages origin. With a controlled test account,
   check anonymous rejection, signed-in queries, 429s, source snippets, missing
   details, wrong-age diagram rejection and an actual Qwen response. Confirm queue
   writes and content logging settings. Live inference has not been benchmarked
   by the local mocked tests.

Queue items are private KV entries named `draft:<uuid>`. Account administrators
can inspect/export them with Wrangler `kv key list` and `kv key get` using the
queue namespace ID. There is no public list/approve endpoint; existing player-app
roles do not constitute reviewer authorization.

For local development, put Auth verification settings in ignored `.dev.vars`, run
`npm run dev:askref` on port 5188 and Vite separately with `npm run dev`. This
replaces Pages Functions on port 5188 for AskRef testing. The local Node API still
handles `/api/me` on port 4180. The local page reflects source changes through Vite. No service worker/offline-install guarantee is implemented.

Provider references: [Qwen binding/response schema](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/),
[Workers AI free allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/),
[Worker rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

## Chat interaction checks

Verify that a referee can ask a question, answer a clarification in the same composer, ask why after a completed answer, and change divisions explicitly. Sources and diagrams belong to their assistant message. Enter sends; Shift+Enter adds a line. A failed request stays visible with Retry, and failed turns are excluded from model history. New chat resets history and prevents an old in-flight answer from reappearing. Chat is session-only and does not create a stored user conversation database.

## Local sign-in versus demo mode

Start the normal local site with `npm run dev -- --port 5173 --strictPort` and open `http://localhost:5173`. Neon rejects sign-in POST requests from `127.0.0.1` with `INVALID_ORIGIN`; Vite redirects browser navigation from that address to `localhost`. Vite reads the existing public `VITE_NEON_AUTH_URL` from ignored `.env.local`. Do not override that variable with an empty process environment value when testing sign-in: that intentionally puts the frontend into a no-account fictional demo.

If Auth is unconfigured, AskRef identifies the preview as rulebook-only demo mode instead of asking for an unavailable sign-in. If Auth is configured but the JWT cannot be obtained, AskRef identifies an expired session. Signing in does not provision the AI Gateway, Worker/service binding or local API runtime; those remain separate activation steps.
