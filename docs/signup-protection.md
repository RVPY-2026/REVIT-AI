# Signup and CRM data safety

Apply `0003_signup_protection` before running the updated signup or Zalo onboarding code. It adds two RLS-enabled internal tables (`lead_signup_sessions`, `signup_rate_limits`) with no public Data API policies, plus the Zalo code issuance timestamp. No existing students, accounts or connected chats are changed by the migration.

The combined CRM/learning release also requires the committed journal through `0008_permanent_delete`. Running the new code against an older database can fail on `students.archived_at` or the permanent code-reservation table. A successful `db:generate` only checks schema declarations against snapshots; it does not apply migrations or prove that the deployed database is current.

## Signup configuration

Set the following in the hosting environment and local environment used for live signup testing:

- `NEXT_PUBLIC_SITE_URL`: the exact public HTTPS origin for this environment.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: a Cloudflare Turnstile widget restricted to that hostname.
- `TURNSTILE_SECRET_KEY`: its server-only verification secret.
- `SIGNUP_RATE_LIMIT_SECRET`: an independent randomly generated secret of at least 32 characters.

Production fails closed when protection is missing. Development without a widget can skip CAPTCHA and uses a development-only rate-key secret. Widget tokens are verified on the server for success, hostname and the `lead-signup` action, and refreshed after each submission attempt. Turnstile rejects replayed/expired tokens; failures never allocate a student code.

Shared Postgres counters initially allow 20 attempts/IP per 10 minutes, 3 submissions/phone per hour, 30 globally/hour and 100 globally/day. Counters are updated atomically, keyed with HMAC hashes (no raw IP/phone persistence), and committed independently of lead insertion so rejected attempts cannot bypass limits by rolling back. IP attempts are counted before CAPTCHA verification; phone/global limits are applied afterward. Vercel's overwritten `x-vercel-forwarded-for` header is the only trusted IP source. Other hosting uses a conservative `unknown` bucket until a trusted proxy adapter is added. Tune the limits only after measuring real registration traffic, particularly shared office networks.

A random seven-day ownership cookie authorizes retries and code renewal for one profile. The short phone deduplication window is not identity proof. A different browser cannot receive or rotate an existing signup's Zalo code through phone matching. Lost ownership requires staff support. Codes are never returned solely because a URL contains a valid-looking student id.

Expired rate counters are pruned by the authenticated daily worker. An idle Supabase minute scheduler skips HTTP calls, so cleanup may wait for the daily fallback. Token hashes never go to the browser; raw cookies/codes never go to audit or application logs.

## Signup failure diagnostics

Unexpected signup failures return a Vietnamese category and an eight-character support reference. Schema mismatches, connection outages and missing source configuration have distinct messages. Failures after the lead transaction use a separate confirmation message to discourage duplicate submissions. Expected CAPTCHA/rate-limit/duplicate messages remain unchanged.

Find the matching `[lead-signup-failed]` server log using that support reference. Its only payload is incident ID, execution stage and an allowlisted driver error code. Never log the raw exception: Drizzle errors can contain SQL parameters, personal data and connection details. The client shows one focusable error summary, retains the form draft and links to the configured registration contact on Zalo.

### Postgres.js timestamp regression (2026-10-20)

The limiter's raw `ON CONFLICT` expressions previously interpolated JavaScript `Date` objects directly. These parameters bypass the timestamp column mapper, causing the real Postgres.js driver to fail with `ERR_INVALID_ARG_TYPE` before creating the lead. PGlite accepted the values and therefore did not expose this transport mismatch. Raw timestamp parameters now use ISO strings with explicit `::timestamptz` casts; typed timestamp column inserts remain `Date` values.

A regression test checks the compiled limiter SQL parameters. An authorized real-Postgres diagnostic reproduced the failure before the change and passed afterward. The signup server path then succeeded through lead/session/Zalo-code creation inside a transaction that was deliberately rolled back. No diagnostic lead or rate-limit changes were committed and no Zalo messages were sent; CAPTCHA provider transport was outside that diagnostic. Both application and migration connections were checked and already had the matching 0000–0008 migration chain, so no migration was reapplied. Earlier missing-column log entries were historical and did not establish the current signup failure.

## Concurrent staff edits

The contact dialog sends its initial values as a required snapshot, normalizes submitted fields and patches only fields the user changed. Each changed field is compared against current data under a row lock. Other editors' independent fields are preserved; a same-field conflict returns an error and leaves the draft intact. Existing field-level editors keep their own optimistic checks.

The sheet preview is advisory. Commit serializes imports with an advisory lock, locks matching profiles in id order and rebuilds the entire plan inside the transaction. Fields that were filled in the meantime stay intact; freshly edited statuses do not follow the sheet. Replanning also avoids duplicate imported notes. The outcome reports fields/status changes skipped since the commit's initial comparison. Newly inserted and updated rows, timeline entries, notes and import audit commit together.

## Verification

`pnpm test` includes isolated Postgres/PGlite regressions that apply all migrations and execute the actual signup, renewal, limiter, contact, import and outbox code. Fixtures use fake identities and never connect to the shared database. Three existing optional tests still require an explicitly enabled live database.

Deployment validation additionally requires a real Turnstile widget, signed-in staff/student sessions and the Supabase scheduler. Run `pnpm zalo:cron:setup` to check scheduler readiness; follow `docs/zalo-bot.md` to activate it only after deployment.

References: [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [Supabase Vault](https://supabase.com/docs/guides/database/vault), [Vercel Cron plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
