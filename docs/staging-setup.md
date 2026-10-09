# Staging setup and signup verification

The selected organization is the owner's existing Supabase organization. Use a dedicated project named `rvpy-staging`, preferably in Singapore. No production student records are needed for initial verification. Confirm the dashboard's plan/cost before creating a paid resource.

## Project and environment

1. Create the staging project in the selected organization. Save its database password privately.
2. Copy the API URL and publishable key into `.env.local`. Use a publishable key, never a secret/service-role key, for NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
3. Set DATABASE_URL to the transaction pooler URL (port 6543) and DATABASE_URL_DIRECT to the session pooler/direct URL (port 5432). URL-encode reserved password characters. Keep SSL enabled for hosted connections.
4. Set NEXT_PUBLIC_USE_MOCK=false. Restart the Next.js server after changing environment settings.
5. Run `pnpm db:migrate`, then `pnpm db:seed`. These use the committed Drizzle initial migration and reference curriculum. Do not also apply the same SQL with a separate migration system.

Empty optional server variables are treated as unset. Mock access is ignored in production. Public signup never returns a fake success in mock mode.

## Google provider

Follow the [official Google provider guide](https://supabase.com/docs/guides/auth/social-login/auth-google):

1. In Google Auth Platform, create a Web application OAuth client. Configure branding and an external/testing audience as appropriate; add the admin and test-sale Gmail accounts as test users while the consent app is in testing.
2. Request only OpenID, email and profile scopes. Add `http://localhost:3000` as an authorized JavaScript origin for local verification, plus the final staging origin when known.
3. Add `https://<project-ref>.supabase.co/auth/v1/callback` as Google's authorized redirect URI. This is the Supabase provider callback, not the app's callback.
4. In Supabase Authentication, enable Google and Email. Set the Google client ID and secret directly in the dashboard. Keep email password sign-in and anonymous sign-in disabled; the app uses passwordless email links.
5. Set the Supabase Site URL to the current app origin. Allow `http://localhost:3000/auth/callback` and the staging `/auth/callback` URL. Prefer exact URLs over broad production wildcards.

The application uses PKCE with cookie-backed SSR. Google OAuth and passwordless email links both return to `/auth/callback`, which exchanges the authorization code, resolves preapproved roles and sends unknown accounts to `/chua-kich-hoat`. Return paths are constrained to an area the user's roles allow. No roles are taken from user-editable metadata.

For email sign-in, use Supabase's Magic Link email template and keep email/password sign-in disabled. The `/dang-nhap` form calls `signInWithOtp` and redirects the one-time link to `/auth/callback`; allow that exact callback URL for local and hosted environments. Email delivery still depends on the project's SMTP and Auth rate-limit settings.

## Initial staff

Create `data/bootstrap-staff.json` locally; `data/` is ignored by Git. Replace these fake examples with the explicitly approved staff Gmail addresses:

```json
{
  "staff": [
    { "email": "example.admin@gmail.com", "name": "Admin", "roles": ["admin"] },
    { "email": "example.sale@gmail.com", "name": "Sale A", "roles": ["sale"] }
  ],
  "sources": [
    { "code": "A", "name": "Source A", "ownerEmail": "example.sale@gmail.com" }
  ]
}
```

Run `pnpm db:staff data/bootstrap-staff.json`. The script creates preapproved app accounts/roles and owned sources in one transaction. It is repeatable, does not replace existing source owners or reenable disabled staff, and does not create password accounts in Supabase Auth. Google or email sign-in links the provider identity on first login. Real addresses and credentials must stay outside Git.

## Verification gates

- `pnpm test`, `pnpm typecheck`, `pnpm lint`, and a production build with staging environment variables.
- Verify exactly 16 business tables with RLS enabled and no anon/authenticated business policies; confirm direct Data API access does not expose student records.
- Reference source R and 22 grouped foundation topics must exist; trial order 1/2/3 maps to lesson numbers 2/13/14.
- Google login: approved admin and sale enter `/quan-tri`; unknown Gmail sees the activation page. Student-only accounts cannot enter management. Mock cookies have no effect in production.
- Signup: submit synthetic fields at `/dang-ky?src=A`; verify a single student, normalized phone/lowercase Gmail, source A, status history and audit, and a monthly code such as A2610007.
- Repeat the same phone within five minutes: keep the same code and row count. Verify unknown/inactive sources fall back to R. Verify a valid referral code records the internal referrer link.
- Success page shows only the returned code and both configured Zalo group links. Errors preserve entered data and do not navigate to success. Invalid Gmail/phone and missing required fields show inline messages.
- Check 375, 768 and 1280px, light/dark, keyboard navigation, pending-submit prevention and no horizontal page overflow.

Management/student landing pages are guarded entry points for verifying login; full management features and student materials belong to the next implementation step.

## Current verification evidence

On 2026-10-09 the signup flow passed against an isolated, disposable PostgreSQL-compatible PGlite socket server using the application's real postgres.js/Drizzle driver and Server Action. The check ran the real Drizzle migration command, reference seed and staff bootstrap twice, built the production bundle, then submitted the form in Chrome. It verified source/referrer/code, normalized fields, history/audit, retry deduplication, fallback source, both Zalo links, responsive/themes and unauthenticated guards. This does not establish that the hosted Supabase project or real Google OAuth provider is configured.

To reproduce the optional browser check, install @electric-sql/pglite and @electric-sql/pglite-socket outside the app. Set RVPY_PGLITE_MODULE and RVPY_PGLITE_SOCKET_MODULE to their dist/index.js files, and RVPY_PLAYWRIGHT_MODULE to a Playwright index.mjs with Chrome available. Run `node tests/signup-e2e.mjs`. It binds only local ports 55439/3031, uses .next-signup-check separately from the normal preview, and stops its own server/browser after verification. Private staff input contains synthetic examples only and stays in the OS temporary directory.

Hosted staging verification also passed on 2026-10-09: the real Drizzle migration and reference seed ran, 16 business tables have RLS enabled with no business policies, 22 grouped foundation topics exist, and a browser signup wrote a monthly R code to Supabase. The success page had both Zalo links; a public Data API query did not expose the test record. The synthetic test lead is retained as dropped, with history/audit. Supabase's RLS-with-no-policy INFO notices are intentional for this server-only access model ([advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)).

The staging database has one account with the admin role. Google sign-in was verified in the browser and reached the management page with the admin role; an unapproved Google account reached the activation page. The owner reports enabling Email in Supabase after this verification. The app now offers passwordless email links, but delivery and the complete email callback have not been verified against the hosted project. A Next.js current-time prerender warning was addressed by waiting for a real request before constructing the server Supabase client. Typecheck and lint pass after the email form change. Steps 1-2 are complete: hosted database/reference seed, Google admin login, protected entry points, and browser-verified signup with code and both Zalo groups. Additional real sale accounts can be provisioned when the owner supplies their approved Gmail addresses; sale-role setup and scope were verified with synthetic integration data.
