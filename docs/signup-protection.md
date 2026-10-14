# Signup and CRM data safety

Apply `0003_signup_protection` before running the updated signup or Zalo onboarding code. It adds two RLS-enabled internal tables (`lead_signup_sessions`, `signup_rate_limits`) with no public Data API policies, plus the Zalo code issuance timestamp. No existing students, accounts or connected chats are changed by the migration.

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

## Concurrent staff edits

The contact dialog sends its initial values as a required snapshot, normalizes submitted fields and patches only fields the user changed. Each changed field is compared against current data under a row lock. Other editors' independent fields are preserved; a same-field conflict returns an error and leaves the draft intact. Existing field-level editors keep their own optimistic checks.

The sheet preview is advisory. Commit serializes imports with an advisory lock, locks matching profiles in id order and rebuilds the entire plan inside the transaction. Fields that were filled in the meantime stay intact; freshly edited statuses do not follow the sheet. Replanning also avoids duplicate imported notes. The outcome reports fields/status changes skipped since the commit's initial comparison. Newly inserted and updated rows, timeline entries, notes and import audit commit together.

## Verification

`pnpm test` includes isolated Postgres/PGlite regressions that apply all migrations and execute the actual signup, renewal, limiter, contact, import and outbox code. Fixtures use fake identities and never connect to the shared database. Three existing optional tests still require an explicitly enabled live database.

Deployment validation additionally requires a real Turnstile widget, signed-in staff/student sessions and the Supabase scheduler. Run `pnpm zalo:cron:setup` to check scheduler readiness; follow `docs/zalo-bot.md` to activate it only after deployment.

References: [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [Supabase Vault](https://supabase.com/docs/guides/database/vault), [Vercel Cron plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
