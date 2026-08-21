# Masar Portal — Roadmap & Handoff

> **New session? Read this file first, then `docs/checklists-and-wizard.md`.**
> The repo's `CLAUDE.md` holds coding conventions; this holds progress and decisions.

## How to work with Rami
- **Do not write finished code.** Give orders: which file, what it must do, what to run, and why.
- Explain reasoning, not just the choice. Correct mistakes explicitly and name the concept.
- Ask when a decision is genuinely his (architecture, product, trade-offs).
- Config/boilerplate may be given directly, with explanation.
- Level: **strong frontend** (move fast), **intermediate API**, **beginner backend** (go slow).

## Stack
Next.js 16 (App Router) + TS · Tailwind v4 · shadcn/ui (Base UI, Nova preset, `rtl: true`)
Neon Postgres (EU/Frankfurt) · Prisma 7 + `@prisma/adapter-pg` · Better Auth 1.7 · Resend
Cloudflare R2 + Cloudmersive (Phase 5) · Node 24 · npm · Antigravity IDE

## Environments
| | Branch | URL | Database |
|---|---|---|---|
| Production | `main` | portal.masar-center.de | Neon `production` |
| Preview | `develop` | masar-portal-seven.vercel.app | Neon `development` |
| Local | — | localhost:3000 | Neon `development` |

Vercel region **fra1**. Separate `BETTER_AUTH_SECRET` per environment. `BETTER_AUTH_URL` must
exactly match the origin — **no trailing slash** (a slash causes `INVALID_ORIGIN`).
Workflow: work on `develop` → test on preview → merge to `main`.

## Design system
Brand green `#0d4d35` → `oklch(0.3746 0.0748 162.7)`; dark-mode primary `oklch(0.6592 0.1168 162.9)`.
Fonts: Geist (Latin) + IBM Plex Sans Arabic via `html[dir="rtl"] body`.
**Rules:** semantic classes only (`bg-primary`, never `bg-green-800`); logical properties only
(`ps-`, `me-`, `text-start`) so RTL works in Phase 7.

## Route structure
```
src/app/
├── page.tsx        → / (public front door, session-aware, NOT protected) — NOT BUILT YET
├── (auth)/         → centred narrow card layout, NO session check
│   ├── login, signup, forgot-password, reset-password
│   └── verify-email  → verification landing page (public by necessity — see below)
└── (app)/          → session check in layout = THE security boundary
    └── dashboard
```
Any page added under `(app)` is protected by construction.

## Progress
- [x] **Phase 0** Foundation — scaffold, Git/GitHub, routing.
- [x] **Phase 1** Database — users/applications/documents, Prisma 7 + Neon, client singleton.
- [x] **Phase 2** Auth — signup, login, sign-out, server-side protection, email verification
      (Resend, verified domain), verification banner + resend button, forgot/reset password,
      route groups.
- [x] **Deployment** — Vercel prod + preview, custom domain, split databases, `postinstall:
      prisma generate`, `build: prisma migrate deploy && next build`.
- [x] **Phase 2.1** (a) verification-link expiry (7 days), (b) public `/verify-email` landing
      page with all four states, (c) signup enumeration leak closed (`autoSignIn: false`) and
      signup reworked to an in-place "check your inbox" panel instead of redirecting to a
      dashboard it can no longer create a session for.
- [x] **Phase 3** Home page `/`, category picker, `createApplication` Server Action
      (`emailVerified` gate, one-per-category via `P2002`), two-step wizard (identity + category
      question) with ownership checks and DRAFT-only edit gating, dashboard listing applications.
- [x] **Phase 4** `src/lib/checklists.ts` — requirement config, `optional()`, `requirementsFor()`,
      `checklistProgress()`, `findRequirement()`. Wired into `/applications/[id]`.
- [x] **Phase 5** Uploads: validate → Cloudmersive → R2. See "Uploads" below for the pipeline,
      the replace/versioning decision, and what's still missing (delete, admin review, submit
      hasn't been exercised for real — see Immediate next steps).
- [ ] **Phase 6** Admin dashboard: review, per-file notes, notification emails.
- [ ] **Phase 7** i18n (EN/AR) & PWA.
- [ ] **Phase 8** GDPR (delete account, retention), audit log, bulk ZIP export.
- [ ] **Phase 9** API docs for the mobile app.

## Immediate next steps
1. Confirm submission end-to-end: click "Submit application" for real on a fully-uploaded
   application and verify it moves to `PENDING_REVIEW`. Not yet done — there is no "revert to
   draft" action, so testing this makes a real, currently one-way status change.
2. Decide whether a "delete document" action is needed before Phase 6, or whether replace
   (upload again) is enough for launch — not built either way yet.
3. Phase 6: admin dashboard. Nothing on the review side exists — `reviewStatus` and `adminNote`
   are columns with no UI reading or writing them yet.

Only two wizard answers drive checklist logic: `instructionLanguage` (Study) and
`medicalProfession` (Medical). Everything else is information for staff.

## Uploads (Phase 5, Aug 2026)
- Pipeline is synchronous and enforced in one Server Action (`src/lib/actions/documents.ts`):
  validate (size/mime) → Cloudmersive scan → R2 `PutObject` → `Document` upsert. Nothing is
  written to R2 and no `Document` row is created unless the scan comes back clean — an infected
  or unscannable file leaves no trace beyond a server log line.
- **`Document` now has `@@unique([applicationId, requirementCode])`** (migration
  `document_requirement_unique`) — one row per requirement per application, not per upload. A
  re-upload is an **upsert**: `version` increments, `reviewStatus` resets to `PENDING`,
  `adminNote` clears (a new file makes any note on the old one stale), and the superseded R2
  object is deleted after the new row commits — GDPR minimisation, not just tidiness. This
  replaced the plain `@@index([applicationId])` the same way `Application`'s composite unique
  did; still indexed for "all documents on this application" lookups.
- **Upload/replace is allowed in `DRAFT`, `REJECTED`, `NEEDS_REVISION`** — `canUploadInStatus()`
  in `src/lib/uploads.ts`. `PENDING_REVIEW` and `APPROVED` lock the checklist (no upload
  controls render at all). This is the practical reading of the security-rules line below:
  DRAFT is the pre-submission case the rule doesn't explicitly name because nothing has been
  rejected yet.
- **Policy**: PDF/JPEG/PNG only, 10 MB max (`src/lib/uploads.ts`). Extension in the R2 key comes
  from the validated mime type, never the client's filename — confirmed live: a `.txt` renamed
  through a raw file-input assignment (bypassing the `<input accept>` UX hint entirely) was
  correctly rejected server-side with no `Document` row created.
- **R2 endpoint gotcha**: `S3_ENDPOINT` in `.env` is the full bucket URL
  (`https://<account>.r2.cloudflarestorage.com/<bucket>`), not just the host. `src/lib/r2.ts`
  takes `new URL(S3_ENDPOINT).origin` before handing it to `S3Client` — passing the full URL
  through as-is would double the bucket segment on every request path, since `S3Client` appends
  `S3_BUCKET` itself. `forcePathStyle: true` per Cloudflare's own R2 recommendation.
  `VIRUS_SCAN_API_KEY`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY` — see "Env vars" below.
- **`next.config.ts`**: `experimental.serverActions.bodySizeLimit` raised to `12mb` — Next's
  default (1 MB) is well under a scanned document or a phone photo, and would fail silently
  from the applicant's point of view (the request never reaches the Server Action to explain why).
- **`submitApplication`** (same file) flips `DRAFT` → `PENDING_REVIEW` once
  `checklistProgress().canSubmit` is true. Button only renders when that's already true — the
  gate is enforced again server-side regardless. **Not yet clicked for real** — see Immediate
  next steps.
- Cloudmersive call is a raw `fetch` (`src/lib/virus-scan.ts`), not their client SDK — one
  endpoint, not worth a generated-client dependency for.
- Verified live against the real dev database (not just typechecked): create, replace
  (old object superseded, no duplicate row, counter stays correct), and the submit button
  appearing only once 5/5 required documents are in.

Only two wizard answers drive checklist logic: `instructionLanguage` (Study) and
`medicalProfession` (Medical). Everything else is information for staff.

## Security decisions (do not regress)
- `role` / `locale` are Better Auth `additionalFields` with **`input: false`** — otherwise a
  client could POST `role: "ADMIN"` at signup.
- Protection lives in the `(app)` **layout**, never middleware (Edge = no Prisma; header-based
  bypass CVE; too far from the data).
- **Every query scopes by `session.user.id`.** Never trust a client-supplied ID.
- Login errors and the forgot-password flow are deliberately identical for existing and
  non-existing accounts — no account enumeration. On this app that leaks who is applying for a
  German visa.
- **Signup must be identical too** — see "Signup enumeration" below. Found open in Aug 2026.
- **Enumeration is an API-layer property, not a UI one.** Two cases must match on the *wire*:
  same HTTP status, same body shape, same timing. A generic error message over a 422-vs-200
  difference fixes nothing — the attacker reads the network tab, not the Alert component.
- Email verification does not block login; it **will block creating an application** (Phase 3).
- API keys least-privilege (Resend: sending + one domain). Same for R2 in Phase 5.
- Upload pipeline order is non-negotiable: validate → Cloudmersive scan → then R2. Enforced in
  `uploadDocument` (`src/lib/actions/documents.ts`) — see "Uploads" below.
- Documents are only uploadable/replaceable in `DRAFT`, `REJECTED`, `NEEDS_REVISION`
  (`canUploadInStatus()`) — never `PENDING_REVIEW` or `APPROVED`.

## Signup enumeration (found & fixed Aug 2026)
`api/routes/sign-up.mjs` line 163:
```js
const shouldReturnGenericDuplicateResponse =
  options.emailAndPassword.requireEmailVerification ||
  options.emailAndPassword.autoSignIn === false;
```
With both false, a duplicate signup throws `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` (422) — the
signup form became an oracle for "does this person have a Masar account". Our config had
`requireEmailVerification: false` (deliberate) and `autoSignIn` unset, so the leak was live.

**Decision: `emailAndPassword.autoSignIn: false`.** This flips Better Auth into generic-duplicate
mode: it hashes a throwaway password to equalise timing, calls `onExistingUserSignUp`, and returns
a **synthetic user object** (`token: null`) indistinguishable from a real signup.

- `requireEmailVerification: true` would also work but reverses the "verification never blocks
  login" decision. Rejected.
- **`autoSignIn` ≠ `requireEmailVerification`.** Turning off `autoSignIn` only stops *signup*
  issuing a session. Login without verification still works.
- Consequence: after signup the user has **no session**. The signup page must not push to
  `/dashboard`. It shows an in-place "check your inbox" panel — and that panel must render
  **identically** for a real signup and a duplicate, decided purely on "the call did not error".
  Never branch on `data.user` / `data.token`: the duplicate response's user is fake.
- `onExistingUserSignUp` sends the existing user a quiet "you already have an account" email.
  Wrap its body in try/catch — a Resend failure must not change response timing.

## Email verification decisions (Aug 2026)
Found by a real bug: signed up on desktop, opened the email next morning on a phone, clicked
verify, banner stayed. `user.emailVerified` was still `false` — the token had **expired** and the
failure was completely silent.

### Settings chosen
- **`expiresIn: 60 * 60 * 24 * 7`** (7 days). Default `3600` (1 hour) is far too short for
  applicants in Syria who read mail hours later on a phone.
- **`autoSignInAfterVerification: true`.** Deliberate trade, see risk note below.
- **`emailAndPassword.autoSignIn: false`** (enumeration fix above). Together these mean the
  verification link is the *normal* way into a new account — or the password they just set.
- Password-reset expiry is a *separate* setting and must stay short (~1 h).

### How it actually works (read from better-auth 1.7.1 source, `api/routes/email-verification.mjs`)
Docs do not cover this; verified in shipped code.

- The token is a **stateless HS256 JWT** signed with `BETTER_AUTH_SECRET`. Not a row in the
  `verification` table — nothing is consumed on use, so it replays until it expires.
- **But** `verifyEmail` early-returns if `emailVerified` is already `true`, *before* the
  auto-sign-in block. The link creates a session **only on the unverified → verified
  transition**. The magic-login power is effectively one-shot.
- Risk window is *send → first click* (≤ 7 days), not 7 standing days. Real threats there:
  forwarded email, shared/internet-café device, mailbox compromise. Non-trivial — this app holds
  passports, criminal records and medical reports.
- **Outlook / Defender Safe Links:** a scanner prefetch performs the transition, so the human's
  click hits the early return and arrives **with no session**. Auto-sign-in is unreliable for
  corporate/Outlook mailboxes; the landing page must handle it (state 4).
- Failure redirect is `` `${callbackURL}?error=${code}` `` (`&` if callbackURL already has `?`).
  Codes are **uppercase**: `TOKEN_EXPIRED`, `INVALID_TOKEN`. Published docs say `invalid_token`
  lowercase — docs are wrong, trust the source.

### `/verify-email` landing page — four states
`callbackURL` points at a **public** page (`(auth)` group). It serves success *and* failure, and
two of four outcomes arrive with no session; a protected callback would bounce to `/login` and
swallow the message.

1. `?error=TOKEN_EXPIRED` → "expired" → sign in, press Resend.
2. `?error=INVALID_TOKEN` → same route out, different copy.
3. No error **and** session → `redirect("/dashboard")`.
4. No error and **no** session → already verified / scanner-prefetched / replayed →
   "verified — please sign in." **The non-obvious one; most likely hit via Outlook.**

**No email input on this page** — a resend form here re-opens the enumeration hole. Route users
through `/login` → existing Resend button.

### Other notes
- Verifying on device B never updates device A. Device A needs a hard refresh — expected.
- Cheap expiry test: `expiresIn: 60`, throwaway signup, wait two minutes, click. Don't ship the 60.
- Test replay too: click a valid link twice; second click must land on state 4.

## Prisma 7 gotchas (already cost us hours)
- `datasource` holds **only** `provider`. `url`/`directUrl` were removed in v7.
- Connection config is `prisma.config.ts` using `env("DIRECT_URL")`; needs `import "dotenv/config"`.
- Generated client has no `index.ts` → import from `@/generated/prisma/client`.
- Files loaded by CLIs (`lib/auth.ts`, `lib/prisma.ts`) must use **relative** imports — `jiti`
  does not understand the `@/` alias.
- `P2022 column does not exist` = stale client. Fix: `prisma generate`, delete `.next`, restart.
- `P3009 failed migration` = migration history out of sync (e.g. a schema-only Neon branch, which
  copies tables but **not** `_prisma_migrations` rows). Fix: `prisma migrate resolve --applied <name>`.
- Never `prisma migrate reset` against production.

## Better Auth notes
- Client method is **`requestPasswordReset`** (not `forgetPassword`).
- `sendVerificationEmail` / `sendResetPassword` receive a ready-made `url` — **use it as given**,
  never rebuild it from `BETTER_AUTH_URL` + token.
- `callbackURL` for verification is **`/verify-email`** (public), passed at both
  `signUp.email()` and `sendVerificationEmail()`. Not `/dashboard`.
- `trustedOrigins: [process.env.BETTER_AUTH_URL!]`.
- `emailVerification.expiresIn` is in **seconds**, default `3600`. Not the same as
  `session.cookieCache.maxAge` — different mechanism, different failure mode.
- Verification tokens are signed with `BETTER_AUTH_SECRET`. Rotating it kills every outstanding
  link — with a 7-day window, up to a week of dead links.
- **Rate limiting** (`context/create-context.mjs` line 171):
  `enabled: options.rateLimit?.enabled ?? isProduction`, `window: 10`s, `max: 100`,
  `storage: "memory"` unless `secondaryStorage` is set. **Memory storage is near-useless on
  Vercel** — every lambda instance keeps its own counter and instances recycle. Since
  `sendVerificationEmail` is unauthenticated and sends real mail, this is an open Resend-quota
  abuse vector. TODO before launch: give `rateLimit` a shared store (Upstash/Redis via
  `secondaryStorage`) or a DB-backed store.

## Open questions for Masar
Only one left: confirm applicants do **not** upload motivation letter, Europass CV, visa
application form, blocked account, health insurance, accommodation proof, anabin/ZAB, job-search
proof, university admission — i.e. Masar prepares these. (Assumed yes, from the final
requirements table.)

## Env vars
`DATABASE_URL` (pooled), `DIRECT_URL` (unpooled), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`RESEND_API_KEY`, `EMAIL_FROM`. Logo URL is hard-coded in code (public, not secret).

R2 / Cloudmersive (Phase 5): `S3_ENDPOINT` (full bucket URL — see the endpoint gotcha under
"Uploads"), `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
`VIRUS_SCAN_API_KEY`.

Git-ignored: `src/generated`, `.claude/skills/`, `.agents/`, `.windsurf/`, `skills-lock.json`.

**Stray var found in `.env`:** `DEBUG_TOKEN` — leftover from a `src/app/api/debug/env/route.ts`
that was added in commit `943641d` ("debug") and removed again in `dcc4e27`. The route is gone;
the env var isn't. Worth deleting from `.env` next time it's touched — not done now since it's
unused and harmless, and this session didn't go looking for it on purpose.
