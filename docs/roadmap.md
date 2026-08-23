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
- [x] **Phase 6** Admin dashboard: role-gated `/admin`, per-document review (approve/reject/
      request-changes + note), application-level decision, notification email, resubmission
      loop. See "Admin dashboard" below.
- [x] **Phase 7** EN/AR language switch, RTL, translated applicant-facing UI (see "i18n" below),
      plus installable PWA — manifest, service worker, offline fallback (see "PWA" below).
- [x] **SEO/meta pass** (Aug 2026, between Phase 7 and 8) — locale-aware title/description/OG/
      Twitter cards, `noindex` on every authenticated section, `robots.txt` + `sitemap.xml`. See
      "SEO" below.
- [x] **Phase 8** Legal & brand shell — Impressum, portal-specific Datenschutz (EN/AR), cookie
      consent banner, legal links wired into every layout. See "Legal & brand shell" below.
- [x] **Phase 9** Auth providers — Google sign-in/signup. See "Google OAuth" below. Verified live
      end-to-end against real Google credentials, locally. **Still needed: the same
      `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` added to Vercel (preview + prod)** — only local
      `.env` has them so far.
- [ ] **Phase 10** Visual identity — dark/light mode, imagery, animation, header/footer redesign
      matching masar-center.de. **In progress**: brand colors + dark-mode toggle shipped for the
      public pages (home, all `(auth)` pages). See "Visual identity" below. Still open: real
      imagery (hero/category art is still placeholder), the wizard/dashboard/admin surfaces
      (deliberately out of scope for this pass), and any animation.
- [ ] **Phase 11** GDPR follow-through — self-service delete account, retention limits, audit log,
      bulk ZIP export. (Was "Phase 8" before the roadmap split — renumbered, not dropped.)
- [ ] **Phase 12** API docs for the mobile app. (Was "Phase 9".)

## Immediate next steps
1. **No way to change a decision once made.** `decideApplication` only runs from
   `PENDING_REVIEW` — an admin who mis-clicks Approve/Reject has no undo. The applicant would
   need to be talked into... there's no path back at all from `APPROVED`, since nothing in the
   app ever un-approves. Worth a hard look before this is used for anything real.
2. **Wizard answers (name, phone, passport, instructionLanguage/medicalProfession) still aren't
   editable during `NEEDS_REVISION`/`REJECTED`** — only documents are. `saveIdentityStep`/
   `saveQuestionStep` in `src/lib/actions/wizard.ts` still gate on `status === "DRAFT"` exactly.
   If an admin ever rejects on a wizard-answer problem (wrong profession, expired passport
   number typo) rather than a document problem, the applicant has no way to fix it. Not touched
   this phase — the review UI has no way to express "the answer is wrong," only "the file is
   wrong."
3. Per-document review and the application-level decision are **intentionally uncoupled** — an
   admin can Approve the whole application without having reviewed any individual document, or
   flag every document NEEDS_REVISION and still click Approve. No software gate stops a
   contradictory decision; it's trusted admin judgement. Revisit if that turns out to be a
   problem in practice.
4. **Server Action error strings are still English-only** — see "i18n" below, "What's NOT
   translated."

Only two wizard answers drive checklist logic: `instructionLanguage` (Study) and
`medicalProfession` (Medical). Everything else is information for staff.

## Google OAuth (Phase 9, Aug 2026)
- **One shared Google OAuth client across all three environments** (Rami's choice over one client
  per environment) — a single `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` pair, same value in local
  `.env`, Vercel preview, and Vercel prod, with all three redirect URIs
  (`.../api/auth/callback/google` for localhost, the preview domain, and `portal.masar-center.de`)
  registered on the one Google Cloud OAuth client. Deliberately *not* mirroring how
  `BETTER_AUTH_SECRET` is isolated per environment — simpler to run solo, revisit if that ever
  stops being true.
- **Account-linking behaviour verified by reading `node_modules/better-auth/dist/oauth2/
  link-account.mjs` directly, not assumed from docs** — same "trust the source" standard already
  applied to email verification and the signup-enumeration fix. No `account.accountLinking`
  config was added; Better Auth's *default* behaviour already does the safe thing here:
  - A Google sign-in whose email matches an existing local user **auto-links** (creates an
    `Account` row on the existing `User`) only when that user's own `emailVerified` is already
    `true` (`requireLocalEmailVerified` defaults to `true`). Google itself always reports its own
    email as verified, so the provider side is never what blocks a link.
  - If the local account is **not** verified yet, linking is refused — the callback redirects to
    `errorCallbackURL` with `?error=account_not_linked`, which `LoginForm` maps to a specific
    translated message telling them to log in with their password and verify email first (Google
    sign-in then works automatically afterward, no separate "link your accounts" flow needed).
  - This is not an enumeration vector the same way the email/password forms were: triggering it at
    all requires already controlling a real Google account with that exact email, a materially
    higher bar than typing an address into a form.
- **New user via Google needs no verification email and no "check your inbox" step** — unlike
  email/password signup (`autoSignIn: false`, deliberately no session — see "Signup enumeration"
  below), a brand-new Google sign-up gets `emailVerified: true` and a session immediately, since
  Google already vouches for the address. `role`/`locale` still come from `User`'s Prisma
  defaults / Better Auth `additionalFields` exactly as for email signup — nothing provider-specific
  needed there, confirmed by reading `handleOAuthUserInfo`'s `createUser` call.
- **UI**: `GoogleSignInButton` (`src/components/auth/google-sign-in-button.tsx`) is one shared
  component used by both `LoginForm` and `SignupForm`, calling
  `authClient.signIn.social({ provider: "google", callbackURL: "/dashboard", errorCallbackURL:
  "/login" })`. Better Auth's client does the actual `window.location` redirect to Google itself
  on success — the component only needs to handle a failure *before* that redirect (e.g. a
  provider-not-configured 500, which is exactly what happens right now with no real
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` set — confirmed live, see below). A failure *after*
  Google redirects back arrives as `?error=...` on `/login` instead, read server-side in
  `(auth)/login/page.tsx` and passed into `LoginForm` — same "read searchParams in the Server
  Component, not `useSearchParams()`" convention `/verify-email` already established.
- Error codes off the OAuth callback are **lowercase snake_case** (`account_not_linked`,
  `unable_to_link_account`, …) — read from `OAUTH_CALLBACK_ERROR_CODES` in
  `node_modules/better-auth/dist/oauth2/errors.mjs`. Unlike the email-verification flow's
  uppercase codes, this one really is lowercase in both docs and code — no docs/code mismatch here.
- Verified live (Arabic, dev server): both `/login` and `/signup` render the divider + Google
  button correctly, RTL-mirrored; clicking it with no real Google credentials set hits
  `POST /api/auth/sign-in/social` → 500 (`BetterAuthError: CLIENT_ID_AND_SECRET_REQUIRED`, logged
  server-side) and the button surfaces the translated `errorSocialGeneric` message rather than a
  raw English string or a silent failure.
- **Then verified live a second time with real credentials, once Rami added them to local
  `.env`** — a full real handshake, not just the redirect construction: clicking the button sent
  the browser to `accounts.google.com`'s actual account chooser (correct `client_id`,
  `redirect_uri=http://localhost:3000/api/auth/callback/google`, `scope=email+profile+openid`,
  PKCE `code_challenge` all present and correct), picking an already-signed-in Google account with
  **no password entry** (an already-authenticated account, not a login prompt) completed the
  round trip, and landed back on `/dashboard` fully signed in. Checked the database directly
  (`prisma.user.findUnique`) to confirm what actually happened rather than trusting the redirect
  alone: the email belonged to an **existing** user with a `credential` account from a prior
  session (`emailVerified: true`) — Google auto-linked by creating a *second* `Account` row
  (`providerId: "google"`) on the **same** `User`, not a duplicate account. Exactly the
  auto-linking behaviour predicted above from reading `link-account.mjs` directly. The
  `account_not_linked` path (an *unverified* local account trying Google) is still unexercised —
  would need a fresh unverified test signup to trigger on purpose.

## Visual identity (Phase 10, Aug 2026 — in progress)
- **Real brand discovered by reading the live site, not assumed** — `CLAUDE.md` and this file both
  said "Masar brand green #0d4d35," but browsing masar-center.de directly (dark navy background,
  blue "MASAR" wordmark, orange/amber accents — no green anywhere, light or dark mode) showed that
  was never actually the real brand, just what got coded early on. Confirmed with Rami, who gave
  exact values: primary blue `#0054d7`, accent orange `#fb3b17`.
- **Mockup first, on a design canvas, before touching component code** — Rami's choice, given how
  broad "I find the UI/UX boring, I want to change many things" was. Two artboards (home page,
  login) with `darkMode`/color tweaks, built from the real tokens in `globals.css` and `ui/*`
  (radii, spacing, button/card shapes) rather than invented from scratch, so approving the mockup
  meant approving layout AND brand, not just a color swap. Once approved, carried into real code —
  the canvas was a decision tool, not a spec left to rot.
  - One real asset swap happened on the canvas itself, via an artifact comment: Rami pointed at the
    hand-drawn placeholder logo mark and asked for the real one from
    `masar-center.de/favicon-512x512.png`. Downloaded, downsized ~102 KB → ~16 KB (`System.Drawing`
    via PowerShell — no image tool was installed), re-seeded, republished, replied and resolved the
    thread.
- **`--primary` in `globals.css` actually changed this time** (oklch equivalents of the exact hex
  Rami gave, computed with the real sRGB→OKLab→OKLCH math, not eyeballed) — light `oklch(0.4939
  0.2126 260.9)`, a brightened `oklch(0.62 0.17 261)` for dark mode (same hue, more lightness/less
  chroma so it still pops on the new navy background; masar-center.de's own dark hero didn't show a
  clear reference point for this, so this is a judgment call, not read off the source).
- **A new `--brand-accent`/`--brand-accent-foreground` token pair, deliberately separate from
  shadcn's own `--accent`/`--accent-foreground`.** The temptation was to repaint `--accent` orange
  directly — wrong, because shadcn components already use `--accent` for neutral hover/active
  surfaces throughout the UI (ghost button hover, dropdown hover, …); doing that would have made
  every hover state orange instead of the sparing highlight masar-center.de actually uses it for
  (a stat number, a status dot). Used today on the home page's step-number circles and the hero
  illustration's checklist accents; available anywhere else as `bg-brand-accent` /
  `text-brand-accent`.
- **A dark-mode toggle now actually exists** — previously `.dark` was a fully dead class in
  `globals.css`: real tokens, zero code path that ever applied it (no `next-themes`, no
  `prefers-color-scheme` wiring, nothing). `src/lib/theme.ts` / `src/lib/actions/theme.ts` /
  `theme-toggle.tsx` are a deliberate copy of the exact `locale.ts`/`actions/locale.ts`/
  `LocaleSwitcher` shape (cookie + Server Action + `router.refresh()`, not `revalidatePath` — see
  `setLocale`'s comment for why that specific mechanism was chosen, unrelated to theme but the same
  reasoning applies) — same pattern, so the two toggles behave identically and a future maintainer
  only has to learn it once. Cookie-only, no `User.theme` column: unlike locale, nothing
  server-side (emails, Server Action copy) needs to know the visitor's theme, so there was no
  reason to add a migration for it.
  - The `<html>` class is set once, in the root layout, from the cookie — server-rendered, no
    flash-of-wrong-theme, same mechanism already trusted for `dir`/`lang`. That also means the
    preference is genuinely global: toggling it on the home page and then navigating into
    `(app)`/`admin` keeps it dark there too, even though those layouts don't have their own visible
    toggle button yet (out of scope this pass, see below) — it's one root-level class, not a
    per-layout setting.
  - Verified live: clicking the toggle on `/` flips the whole page — navy background, brightened
    blue buttons, category-card icon tints, the orange step numbers — and flips back; same toggle
    now sits in the shared `(auth)/layout.tsx` header (next to `LocaleSwitcher`), so it covers
    login/signup/forgot-password/reset-password/verify-email in one place rather than duplicated
    per page.
- **Scope, decided explicitly**: home page + every `(auth)` page this pass (they already share one
  layout, so most of the work was one edit, not five). `(app)` (wizard, dashboard, checklist) and
  `admin` are untouched on purpose — same "different, out-of-scope lane" reasoning already applied
  to i18n and the legal-footer rollout — but they inherit the new color tokens for free (buttons,
  cards, focus rings) since those aren't gated by route the way the header/toggle are, so they
  already look less green even without a dedicated pass. **Revisited a day later**: Rami asked to
  bring the checklist/upload UI specifically into this pass too — see "Checklist & upload UX"
  below. The rest of `(app)` (dashboard cards, wizard steps) and `admin` are still untouched.
- **No real photography exists for this product** — the old `public/` image assets
  (`globe.svg`/`next.svg`/etc., the create-next-app defaults) were already removed before this
  session; there was never a portal-specific photo to begin with. The hero graphic and category
  icons are hand-drawn placeholders (inline SVG, geometric shapes), flagged as such at every
  handover rather than passed off as finished. Real imagery is the natural next step once this
  direction is confirmed live for a while, not done here.
- Verified live (Arabic, dev server), both light and dark: home page (header logo, hero + hero
  illustration, category cards, step numbers, footer) and `/login` (logo lockup, form, Google
  button, divider) all render correctly with the new tokens; `npm run typecheck` and `npm run
  lint` both clean throughout.

### Header layout + password visibility (follow-up, same day)
Two more rounds of real feedback after the initial pass shipped — one via an artifact comment on
the design canvas (about the *real app*, not the mockup itself), one directly in chat.
- **Password show/hide toggle.** `src/components/ui/password-input.tsx` — `Input` plus an eye-icon
  button, `type` state toggled locally, `tabIndex={-1}` so it never enters the tab order or submits
  the form (same reasoning as a browser's own native reveal-password control). Locale-agnostic like
  the other `ui/` primitives: takes `showLabel`/`hideLabel` as props rather than calling
  `useTranslations` itself — callers pass the new `Common.showPassword`/`hidePassword` keys. Now
  used on every password field in the app: login, signup (×2), reset password (×2).
- **Header centering went through three shapes across three rounds of real feedback, each one a
  genuine correction, not a false start:**
  1. First fix (for the actual bug Rami reported: the flex `justify-between` original always
     pinned the logo to the start in LTR, never truly centered): a 3-column `[1fr_auto_1fr]` grid,
     applied identically on every breakpoint — two equal side tracks force the middle column
     (logo) into the true visual center regardless of how wide the buttons on either side are.
  2. Rami's next round: centering was only ever wanted on **mobile** — desktop should look exactly
     like it did before any of this (logo at the start, buttons at the end) — and separately, the
     buttons sharing a row with the now-centered mobile logo "looked bad" and needed their own
     spot. Fixed by splitting into two responsive blocks per header: below `sm`, a stacked layout
     (a compact buttons row, then a centered logo row below it); at `sm` and above, back to the
     original single flex row. Applied to both `home-content.tsx`'s header and
     `(auth)/layout.tsx`.
  3. Rami's final round, scoped to `(auth)/layout.tsx` only: wanted the login/signup logo centered
     at **every** width, not just mobile, with the language/theme buttons pulled into their own
     "mini header." Shape 2's responsive split couldn't do that (desktop was deliberately
     non-centered by then), so it was replaced with something structurally simpler: a slim,
     always-present utility bar (its own `border-b` row, buttons end-aligned) sitting above a
     separate centered column holding the logo, the card, and the footer. No responsive split at
     all — the logo is centered at every width because it no longer shares a row with anything
     that could push it off-center. `home-content.tsx`'s header was **not** touched in this final
     round — only the auth layout was named in the request — so it still uses shape 2 (centered +
     stacked on mobile, original row on desktop). Worth asking Rami whether the home page should
     get the same mini-header treatment for consistency, or whether its wider nav (up to 4 items
     vs. 2) is different enough to warrant staying as-is.
  - Verified live each round, not just typechecked — including one live DOM-hack check (toggling
    the `sm:hidden`/`sm:flex` classes off via the browser console and forcing a narrow `max-width`
    on the block) after the browser automation's own `resize_window` tool turned out not to
    actually shrink this session's viewport below ~1000px, so an ordinary screenshot at a narrow
    width wasn't available — noted here in case that tool limitation matters again.

### Checklist & upload UX (follow-up, next day)
Rami's own words: the upload card "look bad with checkbox that not needed and no good ui/ux where
should user click and after upload there is no big ui change after upload." Three concrete, real
problems, not a vague "make it nicer" — each traced to a specific piece of `applications/[id]/
page.tsx` and `upload-control.tsx`, not guessed at.
- **The "checkbox"**: the not-yet-uploaded state used a lucide `Square` icon — a hollow outlined
  square — with a code comment already reasoning through this exact risk ("a hollow circle reads
  as an unchecked radio button... a square doesn't carry that expectation") and picking `Square`
  to avoid it. Wrong call, confirmed by a real user reading it as a checkbox anyway — outlined
  squares and circles are *both* the two most common checkbox/radio shapes in UI, there wasn't a
  safe hollow-outline option. Replaced with a filled circular badge (muted gray + a `FileText`
  icon when empty, `bg-emerald-500/15` + a `Check` icon when uploaded) — filled circles read as a
  status indicator, not a form control, and it reuses the same `emerald` success color
  `document-review-status.ts` already uses for "Approved."
- **"Where should user click"**: the old control was a native `<input type="file">` restyled with
  Tailwind's `file:` pseudo-class variants — small (`text-xs`), inline with a label, and shaped
  like the browser's own inconsistent-across-browsers file-picker chrome rather than a real button.
  Replaced with a full-width `Button`-styled `<label>` (`Upload`/cloud icon, big and obviously
  clickable) wired to an `sr-only` (not `hidden` — `display:none` would drop it from the tab
  order) file input via `htmlFor`/`peer`, so a keyboard user tabbing to the real input still sees a
  focus ring on the visible label (`peer-focus-visible:ring-*`, matching `Button`'s own
  `focus-visible` styling exactly). The empty-slot button is full emphasis (`variant="default"`);
  once something's uploaded, "Replace" drops to `variant="outline"` — replacing isn't the row's
  main call to action once it's done.
- **"No big UI change after upload"**: technically the page *was* already updating correctly —
  `uploadDocument`'s `revalidatePath` plus the Server Action's implicit route refresh means fresh
  data really does render — but the old version's only visible delta was a small icon swap
  (`Square` → `CheckCircle2`) and a line of filename text appearing inline. Perceptually nothing
  "happened." Fixed on three levels: the whole `<li>` gets a `transition-colors` background/border
  wash to a light emerald tint on upload (animates smoothly since the `<li>` itself never
  remounts — same `key={requirement.code}` throughout, just new props); the status badge is keyed
  on upload state (`key={uploaded ? "done" : "empty"}`) so it remounts and replays a `tw-animate-
  css` `zoom-in-50` entrance on every real transition, not just on first paint; the filename now
  renders as its own bordered chip (icon + name + inline `Delete`) with a `fade-in` entrance,
  instead of small inline text easy to miss.
- **`tw-animate-css` actually wired in for the first time** — it's been an unused dependency since
  whichever `shadcn` scaffolding step installed it (`grep` across `src/` found zero uses before
  this). `@import "tw-animate-css";` added to `globals.css` right after the Tailwind import; this
  is what makes `animate-in`/`zoom-in-50`/`fade-in`/`duration-*` resolve as real utility classes.
- Verified live end-to-end against the real dev database and a real (if trivial) test upload, not
  just typechecked: created a fresh Ausbildung draft, uploaded a small real JPG through the actual
  file input (`file_upload` on the underlying `sr-only` element, not the visible label — clicking a
  file input opens a native OS picker no automation tool can see into), and watched the full
  round-trip — Cloudmersive scan → R2 → DB upsert → `revalidatePath` → the new green success state,
  filename chip, and "1 of 5 required documents uploaded" progress bar all landing correctly.
  Confirmed the already-submitted Medical (D16) application's *locked* checklist (13/13 uploaded,
  no upload controls rendered — `canUpload` correctly false) also renders the new "done" styling
  correctly. Checked Arabic/RTL rendering too — icons and buttons mirror correctly, nothing
  clipped. Test application deleted afterward, no leftover data.

### Stray Vercel favicon (found & fixed, same day)
Rami noticed the browser tab sometimes showed the Vercel triangle logo instead of the Masar mark.
Cause: `src/app/favicon.ico` was still the literal `create-next-app` default (confirmed by
converting it to a viewable PNG — it really was the black triangle), untouched since the initial
scaffold (Aug 19) — while `src/app/icon.png` (the real mark, generated during the Phase 7 PWA
pass, Aug 22) sat right next to it. Next's file-based metadata convention auto-detects *both* and
emits a `<link rel="icon">` for each; which one a browser actually paints in the tab is
inconsistent (varies by browser and by favicon cache state), which is exactly the intermittent
"sometimes" Rami described — it was never actually random, both icons were genuinely being served
at once. Fixed by deleting the stale `favicon.ico` outright — `icon.png` alone is sufficient,
Next's own convention doesn't require a `.ico` file. Confirmed live: `document.querySelectorAll
('link[rel*="icon"]')` now returns exactly one entry (`icon.png`, 512×512), no `favicon.ico`
reference anywhere in the rendered `<head>`. A visitor's own browser may still show the old icon
from its favicon cache until that clears — this fixes the source, not already-cached tabs.

### Form enhancements — prefill, phone validation, error-clearing bug, dashboard logo (same day)
Four small, concrete asks from Rami, all in the wizard's identity step and the `(app)` header.
- **Name prefill.** `fullNameLatin` (a passport-Latin-letters-only field) now falls back to
  `session.user.name` when the application doesn't have one saved yet — but *only* when that name
  already satisfies the same Latin-letters rule the field validates against
  (`isLatinName()`, new export in `src/lib/wizard.ts`, `.source` shared with the Server Action's
  own check so there's exactly one rule, not two that could drift). A Google/email name written in
  Arabic script is deliberately left blank rather than prefilled with something that would fail
  validation the instant they hit save — prefilling wrong is worse than not prefilling.
- **Phone validation, made visible before the round-trip.** The server-side regex
  (`isPhoneNumber()`, same `wizard.ts`, same "use server" can't-export-a-const reason the name
  pattern lives there too) is now also passed down as the input's HTML `pattern` attribute
  (`.source`) plus a real hint line ("Include the country code, e.g. +963 912 345 678") — a
  malformed number now gets caught by the browser's own native validation as you type, not only
  after a submit-and-reload.
- **The real bug: fields silently clearing on a validation error.** `IdentityStep`'s four fields
  used `defaultValue` (uncontrolled) rather than `value`+`onChange`. This project already has one
  documented case of exactly this failure mode — `docs/roadmap.md`'s own i18n section describes
  `revalidatePath("/", "layout")` recreating an uncontrolled `<input>`'s DOM node and silently
  reverting it to its stale server value, which is why `setLocale` was rewritten to avoid
  `revalidatePath` entirely. `IdentityStep` never got the same fix because the wizard's own Server
  Action doesn't call `revalidatePath` on a *validation failure* path (only after a successful
  save) — but the failure was real and reproducible anyway: typing an invalid name and submitting
  showed the error correctly, but on a re-render triggered by the action dispatch itself, the
  three OTHER fields (and, worse, the invalid field, replaced with a value the applicant never
  actually typed) reset back to whatever was last saved in the database. Fixed by converting all
  four to controlled inputs with local `useState`, seeded once from the server `defaults` prop —
  state that lives in the client component instance survives any number of parent re-renders,
  regardless of what triggers them. Confirmed live: intentionally broke the name field, submitted,
  watched the invalid value stay showing next to its error while phone/passport/expiry visibly
  kept their correct values — the actual bug, not a hypothetical one.
- **Dashboard logo.** `(app)/layout.tsx`'s header still had the plain pre-rebrand "Masar Portal"
  text wordmark with no mark — missed in the original Phase 10 pass because `(app)` was explicitly
  out of scope for that one. Added the same `icon-192.png` + wordmark treatment used everywhere
  else now (home, auth pages), matching them exactly rather than inventing a fourth variant.
- Verified live against the real dev database: created a genuinely fresh Ausbildung draft (no
  `fullNameLatin` saved anywhere yet) and confirmed the name prefill actually fires from the
  signed-in session, not just from a coincidentally-matching previous save; confirmed the phone
  hint text renders; confirmed the dashboard header shows the logo. Test applications deleted
  afterward, no leftover data. `npm run typecheck` / `npm run lint` clean throughout.

### `(app)` header mobile menu (same day)
Even after the last round, `(app)/layout.tsx` was still the one header never given a mobile
treatment — logo, language, admin link, user's name, and sign out all crammed into one unwrapped
flex row. On a phone that's genuinely too much for one line and wraps badly, which is what Rami
actually reported.
- **Dropped the user's name from the header entirely** — desktop and mobile both, not just hidden
  below `sm`. It was redundant real estate: the dashboard body already says "Welcome, {name}."
  Fewer items to fit changes what the header even needs to solve.
- **Everything else moved into a slide-out drawer, mobile only.** Desktop (`sm` and up) keeps the
  original inline row (language, admin link, sign out) — there's room, no reason to change what
  isn't broken there. Below `sm`, those three collapse into a hamburger trigger
  (`src/components/app-mobile-menu.tsx`) that opens a panel sliding in from the *end* edge.
  Deliberately scoped to just those three items — no placeholder Profile/Blog/Contact-us links
  added yet (Rami's call, over adding them now): a menu entry pointing nowhere real is worse than
  a short menu, and this is exactly the extensibility point those get added to once they're real
  pages, without touching the header again.
- **Built on `@base-ui/react`'s `Drawer` primitive at first pass, then switched to `Dialog`.**
  Base UI genuinely ships both, and `Drawer` looked like the obvious name match — but reading its
  actual type defs (`DrawerSwipeDirection`, `DrawerSnapPoint`, `DrawerHandle`,
  `virtual-keyboard-provider`) showed it's built for swipeable bottom sheets (snap points, drag
  handles), not a side-sliding nav panel, and there's no bundled usage example or CSS to check
  animation classes against — real risk of shipping something subtly broken with no way to verify
  it against a reference. `Dialog` has the identical part shape (Root/Trigger/Portal/Backdrop/
  Popup/Close/Title) with none of that bottom-sheet-specific complexity, styled as a slide-in
  panel by hand (`fixed inset-y-0 end-0`, `transition-transform`, driven by Base UI's own
  `data-open`/`data-closed`/`data-starting-style`/`data-ending-style` presence attributes — same
  Tailwind arbitrary-attribute-selector mechanism, `data-[open]:`/`data-[starting-style]:` etc.).
  `rtl:` variants flip the closed-state translate direction (`translate-x-full` in LTR pushes the
  end-anchored panel off the right edge; RTL needs `-translate-x-full` to push it off the left
  edge instead) — same convention as the icon-flipping already used elsewhere in this app
  (`rtl:-scale-x-100`).
- A worthwhile side note on Android/Play Store readiness, since Rami asked directly: this project
  already has a real installable PWA (Phase 7 — manifest, service worker, offline fallback), and
  the standard path from there to the Play Store is a TWA (Trusted Web Activity) — a thin native
  wrapper via Google's Bubblewrap CLI, not a rewrite. A bottom sheet (which is what Base UI's
  `Drawer` primitive is actually built for) would have been the more Android-Material-idiomatic
  choice over a side drawer — worth reconsidering once there's a real reason to invest in wiring
  up `Drawer` correctly (e.g. an actual TWA wrapper in progress), rather than now, working from
  type defs alone with no way to verify the result. A bottom tab bar was considered and set aside
  for the same "not enough top-level destinations yet" reason as the placeholder-links question
  above — revisit once Profile and a couple more real sections exist.
- Verified live, including RTL: forced the mobile trigger visible (this session's browser
  automation can't actually shrink the viewport below ~1000px — same `resize_window` limitation
  noted earlier in this file — so verification here means removing `sm:hidden`/forcing `sm:flex`
  off via the console, not a real narrow-viewport screenshot) and confirmed the panel opens
  sliding in from the end edge with a dimmed backdrop, the correct three items render as full-width
  buttons, backdrop-click dismiss works, then switched the language toggle *from inside the open
  drawer* and confirmed live in Arabic that the panel switches sides correctly (slides in from the
  left, title/close-button/item alignment all mirror correctly) before switching back to English.

### Mobile menu refinements — flags, placement, admin as a link (same day)
One more round on the drawer above, all from a closer look at it in the browser.
- **Language moved back OUT of the drawer, into the header directly, on every breakpoint.**
  Rami's call over leaving it in the drawer: it's a one-tap toggle used far more than the other
  three items, especially by applicants reading the app in their second language — burying it a
  tap deeper than sign out/admin/theme was the wrong trade. `(app)/layout.tsx`'s header row is now
  `Logo | LocaleSwitcher, [rest]` — the switcher sits outside both the desktop-only `sm:flex` row
  and `AppMobileMenu`, so it renders identically at every width; only sign out/admin/theme still
  differ per breakpoint.
- **Real flag icons, not emoji — found broken live, not anticipated.** First pass used 🇬🇧/🇸🇾
  emoji. Confirmed live on this session's own machine (Windows) that the Syria flag emoji has no
  glyph and silently falls back to rendering the bare two-letter region code — "SY Arabic" in the
  button, reading as a bug, not a flag. Replaced with real inline SVGs
  (`src/components/flag-icon.tsx`): a simplified Union Jack (diagonal/cross stripes centered rather
  than historically offset — a standard simplification at icon size) and the current Syrian flag
  (adopted 2024: green/white/black bands, three red stars — hand-built with computed 5-point-star
  path coordinates, not a placeholder). Same flag *pairing* as before — checked live on
  masar-center.de's own mobile menu, which uses this exact UK+Syria pairing (plus German, which
  this app doesn't need) — just real graphics instead of text glyphs that may or may not exist on
  a given OS/browser.
- **Admin restyled as a plain ghost row, not an outlined button** — a `ShieldUser` icon + text,
  `variant="ghost"` (no border, subtle hover background only), visually reading as navigation
  rather than an action. A visible divider now separates it and the theme toggle (navigation/state,
  grouped together) from sign out below (the one destructive/exit action, kept as the bordered
  button it already was) — a small hierarchy cue for what happens if you tap each one.
- **Theme toggle gained a second presentation rather than a second component.** The state
  (`useTransition`, the `setTheme` Server Action call, `router.refresh()`) only needs to exist
  once; `ThemeToggle` now takes an optional `variant: "icon" | "menu-item"` — `"icon"` is the
  existing compact button (home/auth headers, the `(app)` desktop row), `"menu-item"` is a
  full-width labelled row ("Switch to dark/light mode") for the drawer, where an unlabelled
  icon-only button would have been the one item on the panel with no visible text.
- Verified live end-to-end, light and dark, both languages: the UK flag and the new Syria flag
  (green/white/black, three visible stars) both render as real graphics in the header on every
  breakpoint; opened the mobile drawer and confirmed Admin now reads as a link-style row with a
  divider before Sign out; toggled dark mode *from inside the open drawer* and watched it apply
  instantly (icon swaps moon→sun, label updates to "Switch to light mode", the whole page behind
  the backdrop visibly goes dark) — then toggled back to light before finishing.

### Pending-state UI: spinners, route skeletons, page transitions (Aug 2026)
Rami: login / signup / upload / submit "take some time," with no feedback while they do. This
matters more here than in a typical app — the roadmap's own audience note is applicants in Syria,
often on mobile data, and the upload path in particular is genuinely slow by design (validate →
Cloudmersive scan → R2 → DB, all synchronous in one Server Action).
- **The problem was uniform, so the fix is one component.** Every pending button in the app used
  the same pattern: `disabled={pending}` plus a swapped label (`"Log in"` → `"Logging in…"`). On a
  fast connection that's invisible; on a slow one a label that only changes text reads as "nothing
  happened," and people tap again. Rather than hand-rolling a spinner per form, `Button` (the
  shared `ui/` primitive) gained a `loading` prop that renders a `Loader2` spinner before the
  label, sets `disabled`, and sets `aria-busy` — so screen-reader users get the state too, not
  just sighted ones. Converted every caller: login, signup, Google sign-in, forgot-password,
  reset-password, resend-verification, sign-out, both wizard steps, start-application,
  submit-application, delete-application. `delete-document`'s confirm is a bare `<button>` (a tiny
  text link, not a `Button`) and got the same treatment inline.
  - Deliberately documented on the prop itself: **don't** pass `loading` alongside
    `render={<Link/>}`. An anchor has no disabled state, so it would spin while staying clickable
    — a worse lie than no spinner. All the `render={<Link/>}` buttons in this app are plain
    navigation and were left alone.
- **Route-level skeletons, not just button spinners.** A button spinner covers "I submitted
  something"; it does nothing for "I tapped View checklist and the page is fetching from Neon."
  Added `src/app/(app)/loading.tsx` — Next renders it instantly on navigation while the server
  component awaits its queries. One file covers every nested `(app)` route that doesn't define its
  own. The shape deliberately mirrors the dashboard/checklist layout (heading + stack of bordered
  rows with an icon, two text lines, and a status pill) rather than being a generic centered
  spinner, so the page appears to *fill in* rather than *replace*. New `ui/skeleton.tsx` is the
  pulsing block primitive.
- **Soft page transitions.** `(app)`'s `<main>` and `(auth)`'s card wrapper now carry
  `animate-in fade-in slide-in-from-bottom-1 duration-300` (the `tw-animate-css` utilities wired in
  during the checklist pass). Both are guarded with `motion-reduce:animate-none` — these are
  decorative, so anyone who's asked their OS for reduced motion gets none of it. The button
  spinners deliberately do **not** carry that guard: a spinner is information, not decoration, and
  silently freezing it would remove the very feedback this change exists to add.
- **Verified live, and not by screenshot** — a screenshot round-trip is ~1s, slower than most of
  these actions, so trying to photograph a spinner mid-flight was unreliable and kept missing.
  Used a `MutationObserver` in the page instead, which is deterministic: clicking "Start
  application" recorded `aria-busy="true"`, `disabled: true`, `hasSpinner: true` (a real
  `svg.animate-spin` in the DOM) and the label swapped to `"Creating…"` — proving the shared
  `Button` code path every converted caller uses. Same technique for the route skeleton: observed
  **17** `[data-slot="skeleton"]` blocks appear during a client-side nav to `/dashboard`, which is
  exactly the count `loading.tsx` renders (1 heading + 1 section label + 3 cards × 5 blocks).
  Cleaned up the draft application that "Start application" created as a side effect of the test,
  and restored the theme cookie to light afterwards.

## i18n (Phase 7, Aug 2026)
- **Library: `next-intl`, no `[locale]` route segment.** Locale lives in a cookie
  (`src/i18n/locale.ts`'s `LOCALE_COOKIE`), read server-side in `src/i18n/request.ts`. Same URL
  in both languages — this was the deciding constraint: routed locales (`/en/...` vs `/ar/...`)
  force a real navigation on switch, and the roadmap already required *"switching language must
  not lose form state."* A cookie-based, no-prefix setup was the only option that satisfied that
  outright rather than needing extra engineering to work around it.
- **Switching mechanism, and a bug caught live while testing it**: `setLocale` (
  `src/lib/actions/locale.ts`) sets the cookie and best-effort mirrors it to `User.locale` when
  signed in — but does **not** call `revalidatePath`. The first version did
  (`revalidatePath("/", "layout")`), and confirmed live in the browser that it wiped an
  in-progress, un-submitted wizard field the instant the language was switched — busting the
  *root* layout's cache forces a much more aggressive re-render than revalidating a leaf path
  does, aggressive enough to recreate the DOM node under an uncontrolled `<input>` rather than
  patch it. Fixed by moving to the pattern `next-intl` itself documents for this exact
  cookie-based setup: `LocaleSwitcher` (client) calls the action, then `router.refresh()` —
  re-confirmed live afterward that a typed value now survives the switch.
- **`LocaleSwitcher`** (`src/components/locale-switcher.tsx`) shows the language you'd switch
  **to**, not the current one — a single one-tap toggle, not a select. Placed in the `(auth)`
  layout, the `(app)` layout, and the home page header — i.e. every applicant-facing surface.
  Deliberately **not** in the admin layout (see below).
- **Two kinds of bilingual content, two different mechanisms — don't conflate them**:
  - UI copy (labels, buttons, headings, static strings) → `next-intl` messages,
    `messages/en.json` / `messages/ar.json`, via `useTranslations`/`getTranslations`. Both files
    are kept in lockstep on purpose — verified programmatically (walked both JSON trees, diffed
    the key sets) that all 144 keys match exactly; a missing key throws at render time for
    whichever locale is missing it.
  - Bilingual **domain data** with a stable identity (`checklists.ts` requirements,
    `categories.ts`, `application-status.ts`, `document-review-status.ts`) → already had
    `labelEn`/`labelAr` fields sitting there since Phase 4, now actually consumed via
    `pick(locale, en, ar)` (`src/i18n/pick.ts`) instead of sitting unused. This is *not* the same
    mechanism as `next-intl` — it's plain data selection, no ICU formatting needed.
  - The checklist page used to show **both** `labelEn` and `labelAr` stacked on every row
    (a deliberate stopgap from Phase 4/5, before a real switch existed). Now that one does, that
    page shows only the active locale's label, same as everywhere else — the permanently-bilingual
    display was retired as part of this phase, not left in place alongside the new switch.
- **Arabic plurals are real, not a formality**: `documentsUploaded` in `ApplicationCard` uses
  ICU `{count, plural, one {…} two {…} few {…} other {…}}` — Arabic's CLDR plural categories
  (zero/one/two/few 3–10/many 11–99/other) are genuinely different from English's one/other, and
  confirmed live that 5 documents renders "few" grammar (`تم رفع 5 مستندات`) correctly, not a
  bolted-on `s`.
  Numbers themselves stay Western digits everywhere on purpose (dates, counts) —
  `numberingSystem: "latn"` pinned explicitly in `ApplicationCard`'s `Intl.DateTimeFormat` — for
  consistency with phone/passport-number fields, which are `dir="ltr"` and Latin-only regardless
  of UI language.
- **Admin (`/admin`) is deliberately English-only and LTR always**, regardless of the visitor's
  own locale preference — it's a staff-only internal tool, out of scope for this pass. Getting
  this right took two separate fixes, both caught live in the browser, not anticipated in
  advance:
  1. `dir` is set once on `<html>` from the locale cookie in the root layout — so with an Arabic
     preference active, `/admin` initially rendered English text inside an RTL-mirrored layout
     (badges and dates on the wrong side for the language actually on screen). Fixed with an
     explicit `dir="ltr"` on `admin/layout.tsx`'s wrapper, overriding the inherited root value.
  2. Shared components used inside admin (`SignOutButton`) call `useTranslations()` themselves,
     and inherited the root `NextIntlClientProvider`'s Arabic messages regardless of the `dir`
     fix — "Sign out" was rendering as "تسجيل الخروج" inside an English admin page. Fixed by
     wrapping `admin/layout.tsx`'s whole tree in its own nested `NextIntlClientProvider` pinned
     to `locale="en"` with the English catalog imported directly — nested providers override the
     outer one for everything under them.
- **What's NOT translated, on purpose, this pass**: Server Action-returned error strings (e.g.
  `createApplication`'s `"Please choose a valid category."`, the wizard's field-validation
  messages) and Better Auth's own `error.message` values. Only the client-side static copy —
  labels, headings, buttons, placeholders, and each component's own validation fallback text —
  goes through `next-intl`. Translating action-returned errors would mean threading locale
  through every Server Action and is a real follow-up, not done here to keep this pass's
  changeset to UI copy and data-driven labels.
- **Verified live in the browser, not just typechecked**: home page, signup redirect→dashboard,
  full dashboard, and the checklist page (including per-document review-status badges and admin
  notes picking the right label) all confirmed correct in both languages, RTL mirroring
  (flex order, icon flipping via the existing `rtl:-scale-x-100` convention, card grid order)
  correct without any additional CSS work beyond what CLAUDE.md's logical-properties rule
  already required, and the admin LTR/English-lock confirmed to not leak back into the
  applicant-facing pages when switching between the two sections.

## PWA (Phase 7, Aug 2026)
- **`@serwist/turbopack`, not `@serwist/next` — found live, not anticipated.** The standard
  Serwist-for-Next.js setup (`withSerwistInit` from `@serwist/next`, a webpack `InjectManifest`
  plugin writing a physical `public/sw.js` at build time) is the documented default everywhere,
  and it's what got built first here. It silently produced **nothing** — `next build` completed
  with only an easy-to-miss warning, no `public/sw.js` ever appeared, no error. Cause: Next.js 16
  uses Turbopack for `next build` here, not just `next dev`, and `@serwist/next`'s plugin is
  webpack-only — it doesn't run under Turbopack at all. Since this project's bundler is Turbopack
  throughout (never opted into webpack for anything else), switching the *build* to webpack just
  for the service worker was the wrong direction. Fixed by moving to `@serwist/turbopack`
  instead, which takes a genuinely different mechanism (see below) — confirmed live afterward
  that this one actually emits `public`-equivalent output (45 precache entries, ~1 MB) and the
  browser registers it.
- **Turbopack path serves the SW from a Route Handler, not a static file.**
  `src/app/[path]/route.ts` exports `{ dynamic, dynamicParams, revalidate, generateStaticParams,
  GET }` from `createSerwistRoute({ swSrc: "src/app/sw.ts" })` — this bundles `sw.ts` with
  esbuild and statically generates `/sw.js` and `/sw.js.map` as SSG routes
  (`generateStaticParams` + `dynamicParams: false`, so nothing else can hit `[path]`). Needed
  `esbuild` installed as a **direct** dependency, confirmed live — `@serwist/turbopack` imports
  it dynamically at request time, and Next's `serverExternalPackages` (which
  `@serwist/turbopack`'s own `withSerwist` sets) means it's resolved from this project's own
  `node_modules`, not bundled in, so it has to actually be there.
  `createSerwistRoute`'s `useNativeEsbuild` option **must be pinned explicitly** — its default is
  platform-dependent (`true` on Windows, `false` everywhere else), which is exactly the kind of
  default that works on one machine and breaks in CI. Found live: worked locally (Windows,
  native `esbuild`), then the very next Vercel deploy (Linux) failed with `Cannot find package
  'esbuild-wasm'` — the default silently switched code paths between environments. Fixed by
  passing `useNativeEsbuild: true` explicitly in `src/app/[path]/route.ts`, so only `esbuild`
  (already installed) is ever needed anywhere; `esbuild`'s own postinstall resolves the correct
  platform binary via `optionalDependencies`, so pinning to native works cross-platform without
  needing `esbuild-wasm` as a second dependency.
- **No auto-registration on this path.** `@serwist/next`'s plugin injects a registration script
  for you (`register: true` by default); `@serwist/turbopack` doesn't attempt this at all — it
  only builds and serves the file. `src/components/register-service-worker.tsx` does it by hand
  with the plain `navigator.serviceWorker.register()` API in a `useEffect`, gated to
  `NODE_ENV === "production"` (registering in dev would fight Turbopack's own hot-reload with a
  second caching layer). Confirmed live: `navigator.serviceWorker.getRegistration()` returns an
  `activated` registration scoped to the whole origin after a production build + `next start`.
- **`defaultCache` (from `@serwist/next/worker` — that half of the package is still used, just
  not its webpack plugin) does the actual runtime-caching work**, not hand-picked rules — it's
  already Next.js-App-Router-aware: NetworkFirst for RSC payloads/HTML navigations and `/api/*`
  (so nothing authenticated or personal is ever served stale while a real connection exists — the
  cache is strictly an offline fallback, never a substitute for a live request), CacheFirst/
  StaleWhileRevalidate for static build assets and fonts, and an explicit carve-out for
  `/api/auth/*` so the auth callback flow isn't intercepted. Given this app handles passports and
  medical reports, "never silently serve stale authenticated content" was the property that
  mattered most, and it's already how this behaves.
- **Offline fallback is a static file in `public/`, not a Next.js page — on purpose.** Every page
  in this app inherits the root layout's locale read (`cookies()`, a dynamic API), which makes
  the entire render tree dynamic and un-prerenderable. A fallback that must be available *before*
  the network goes down can't depend on a request-time cookie read — so it can't be a normal
  page under any layout, no matter which one. `public/offline.html` is deliberately outside the
  App Router entirely: plain inline-styled HTML, both languages shown together (the one
  intentional exception to "one language on screen at a time" — there's no locale to key off of
  here). Wired via `sw.ts`'s `fallbacks.entries`, matched on `request.destination === "document"`
  so it only intercepts page navigations, not asset/API requests. Confirmed live via the Cache
  Storage API (`caches.open(...).keys()`) that `/offline.html` is actually in the precache, not
  just referenced.
- **Icons: real mark, sourced from `https://masar-center.de/favicon-512x512.png`** — a proper
  512×512 circular "M" mark (blue gradient, transparent corners), not the email wordmark used
  for the first pass. Generated with `sharp`, installed and run from a scratch directory rather
  than added to this project's own `package.json` — it's a native binary dependency needed for a
  one-time asset-generation script, not anything the running app uses. "any"-purpose icons
  (192/512px) are the source resized as-is, transparent corners intact — it's already a
  self-contained mark, unlike the wordmark, which needed a background composited in to look
  intentional. "Maskable" variants (Android's adaptive-icon safe zone) and the Apple touch icon
  (180px, opaque — iOS mishandles transparency) fill the full square with a white background
  and the mark sized to ~70–82% of the canvas. `src/app/icon.png` / `src/app/apple-icon.png` use
  Next's file-based favicon convention — auto-linked, no manual `<link>` tags.
- `src/app/manifest.ts` uses Next's file-based manifest convention (auto-served at
  `/manifest.webmanifest`, auto-linked from every page) rather than a static `public/manifest.json`.
- **`sw.ts` needs its own tsconfig** (`tsconfig.worker.json`, `lib: ["esnext", "webworker"]`) —
  the `WorkerGlobalScope`/`ServiceWorkerGlobalScope` types aren't available under the main
  `tsconfig.json`'s `dom` lib, and the two libs conflict if combined in one config. `sw.ts` is
  excluded from the main `tsconfig.json` and checked separately
  (`npx tsc --noEmit -p tsconfig.worker.json`) — remember to run both when touching service-worker
  code, the routine `npx tsc --noEmit -p tsconfig.json` alone won't catch a `sw.ts` type error.
- Verified live end-to-end against a real production build (`next build` + `next start`), not
  dev mode: service worker registers and activates, manifest/icons/theme-color all correctly
  auto-linked in `<head>`, `/offline.html` precached, `/manifest.webmanifest` serves the right
  JSON, `/sw.js` serves real compiled content with the precache manifest inside it.

## SEO (Aug 2026)
- **Adapted from `masar-center.de` / `masar-center.de/ar`'s own `<head>` — read directly from
  the live markup, not guessed — not copied wholesale.** This is a different product from the
  parent marketing site, and things were deliberately changed, not just carried over:
  - **`metadataBase`/canonical/sitemap all resolve from `BETTER_AUTH_URL`**, not a hardcoded
    domain — this environment's own origin already lives in that env var (prod, preview, and
    local each have their own), so metadata is automatically correct in whichever environment
    it's built in without a separate SEO-specific env var.
  - **`og:site_name` is "Masar Portal," not "Masar UG"** — title/description/keywords all
    describe what *this product* does (upload documents, follow a checklist, get reviewed), not
    the parent company's general consulting pitch.
- **Locale-aware via `generateMetadata()`, not a static `metadata` export** — title, description,
  and `og:locale` (`en_US`/`ar_SY`) all follow the same cookie-derived locale that decides
  `dir`/`lang` in the layout body. Copy lives in `messages/*.json`'s `Seo` namespace, same
  mechanism as every other translated string in the app, not a separate one-off. Confirmed live
  in both languages — title, description, `og:locale`, and `lang`/`dir` all flip together.
- **Every authenticated section is `noindex, nofollow`** — `(app)/layout.tsx` and
  `admin/layout.tsx` each export their own `metadata` overriding the root's permissive default.
  Confirmed live against a real logged-in session (not just reading the code) that `/dashboard`
  and `/admin` both actually render `noindex, nofollow`, not just the unauthenticated redirect
  target. Auth pages (`/login`, `/signup`) deliberately stay indexable — someone searching
  "masar portal login" should find it; only the pages holding personal data are excluded.
- **`robots.txt` and the `noindex` meta tags are deliberately redundant, not overlapping** —
  `src/app/robots.ts` stops a crawler from *fetching* `/dashboard`, `/applications`, `/admin`,
  `/api` at all; the per-layout `noindex` meta stops a page from being *indexed* even if somehow
  reached. Neither alone is sufficient: a `Disallow` doesn't retroactively deindex a page some
  other site already linked to, and a `noindex` tag only works if the crawler actually requests
  the page to read it.
- **`sitemap.xml` lists the home page and `/ar`** (see below) — the two genuinely public,
  content-bearing URLs. Login/signup carry no unique search value over either, and everything
  else is already excluded via `robots.ts`.
- **`/ar` — a real, separately-crawlable Arabic mirror of the home page.** Raised directly by
  Rami: sharing the portal link in an Arabic-speaking channel got an English preview no matter
  what, because a link-preview crawler (WhatsApp/Twitter/Facebook) makes one cookie-less request
  and only ever sees whatever the *default* locale renders — there was no URL to point an Arabic
  share at. `src/app/ar/page.tsx` is the one deliberate exception to "one URL for both
  languages" (see "i18n" above), scoped to the home page only — the rest of the app (wizard,
  checklist, dashboard, auth pages) still has exactly one URL per page; this doesn't reverse
  that decision, it works around the one place it collides with sharing/discovery.
  `src/components/home-content.tsx` now holds the shared markup, taking `locale` as an explicit
  prop rather than reading it ambiently, so both `/` (cookie-derived) and `/ar` (hardcoded) can
  render it correctly. `alternates.languages` (hreflang) now links `/` ↔ `/ar` — this reverses
  the earlier "no hreflang, meaningless with one URL" reasoning, but only for these two pages
  specifically: a genuine second URL now exists, so pointing crawlers between them is correct
  again. Scoped to `src/app/page.tsx`'s own `generateMetadata` (not the root layout), since the
  root layout wraps every route — putting hreflang there would put an "Arabic version at /ar"
  claim on `/dashboard` and `/login` too, which is simply false.
  - **Three real bugs surfaced building this, all confirmed live, none anticipated going in.**
    Two are `next-intl`'s "explicit locale override" mechanism silently not working at all; the
    third is a Next.js metadata-templating quirk that's easy to hit any time a page defines its
    own title independent of its parent layout:
    1. `src/i18n/request.ts`'s callback receives `{ locale }` — the explicit override passed by
       calls like `getTranslations({ locale: "ar", ... })` — but the first version of this file
       ignored it and unconditionally re-derived locale from the cookie every time. Every
       explicit-locale call was silently overridden back to whatever the visitor's cookie (or
       lack of one) said — `/ar` rendered fully in English for a cookie-less request, with no
       error anywhere. Fixed by checking the passed-in `locale` param first, falling back to the
       cookie read only when none was given.
    2. Even after that fix, `CategoryCard`'s "Start" button stayed English on `/ar` while its
       `pick(locale, …)`-driven label/blurb correctly went Arabic. Cause: it used the *sync*
       `useTranslations("CategoryCard")` hook-style API, which — checked its type definition to
       be sure — has no locale-override parameter *at all*, unlike the *async* `getTranslations`
       used everywhere else. It was reading the ambient cookie-derived locale regardless of the
       `locale` prop the component already had and already used correctly one line below.
       Converted the component to `async` + `getTranslations({ locale, namespace: … })` to match.
       Worth remembering: on this app's few fixed-locale pages, the sync `useTranslations()` hook
       is not safe to use in a Server Component — only the async form, called with an explicit
       `locale`, is.
    3. With both of those fixed, `/ar`'s `<title>` still rendered as "بوابة مسار | Masar
       Portal" — Arabic default, but an **English** template suffix. A page's own
       `title.template` never formats that page's *own* title, only its descendants' (`/ar` has
       none) — the CURRENT segment's title gets wrapped by the nearest *ancestor's* template
       instead, which here was the root layout's cookie-derived (so, English, for this
       cookie-less request) one. Fixed with `title: { absolute: title }`, Next's documented
       escape hatch that skips every ancestor template. `/` never hit this because it never sets
       its own `title` at all, so it was never a "descendant with an explicit title" needing
       wrapping in the first place — the bug only shows up once a page defines `title.default`
       for itself, which is exactly what a fixed-locale page like `/ar` has to do.
  - The `LocaleSwitcher` needed a small extension for this: on `/ar`, the normal cookie-toggle-
    then-`router.refresh()` behavior would flip the cookie and visibly do nothing, since `/ar`'s
    content is hardcoded to Arabic regardless of the cookie. Added an optional `navigateTo` prop
    — when set, it navigates there after switching instead of refreshing in place. `/` passes
    nothing and keeps the plain, already-confirmed-not-to-lose-form-state behavior; `/ar` passes
    `navigateTo="/"`.
  - Verified live, full round trip: `/ar` fetched with no cookie at all renders correctly in
    Arabic throughout (title, description, hero, all four category cards' labels *and* Start
    buttons, footer) with `og:locale: ar_SY` and canonical `/ar`; clicking "English" in the
    header navigates to `/` and `/` renders correctly in English; `/`'s own hreflang correctly
    points back to `/ar` and vice versa; `sitemap.xml` lists both with the alternate-language
    annotations Google's sitemap format supports.
- **`theme-color` now has real light/dark values** (`#1a6b4a` light / `#0d4d35` dark) — read
  directly from `masar-center.de`'s own `<head>`, not invented; the Phase 7 PWA pass had shipped
  a single static `#0d4d35` for both. `color-scheme: light dark` added alongside it.
- **`og:image` is downloaded and self-hosted** (`public/og-image.webp`), not a live cross-domain
  reference to `masar-center.de` — a link preview shouldn't depend on a sibling site staying up,
  keeping the same filename, and never changing its image dimensions out from under whatever
  `width`/`height` we declared. That exact failure mode showed up immediately: the source site's
  own `og:image:width` meta tag says `1042`, but the actual downloaded file is `1200×630` — their
  tag is stale, caught by inspecting the real file rather than trusting the declared value. Same
  reasoning that already justified downloading the PWA icons instead of referencing them live.
  Still the parent brand's asset, not a portal-specific graphic — worth a real one (ideally a
  portal screenshot) later, but at least not fetched from a third party on every crawl.
- Verified live against the dev server, not just typechecked: full rendered `<head>` inspected
  in both languages (title/description/keywords/OG/Twitter/canonical/theme-color all correct),
  `noindex, nofollow` confirmed via `document.querySelector` on real authenticated
  `/dashboard` and `/admin` pages, `/robots.txt` and `/sitemap.xml` both serve correctly and
  both come back **static** (`○`) in a production build despite the rest of the app being
  fully dynamic.

## Legal & brand shell (Phase 8, Aug 2026)
- **Scope decision, made explicitly before building anything**: the original 9-phase roadmap had
  no room for "Google sign-in" + "major visual redesign" as one lump. Split into four: Phase 8
  (this one — Impressum/Datenschutz/cookie consent, since Google's OAuth consent screen wants a
  real privacy policy URL, and there wasn't one), Phase 9 (Google OAuth, now unblocked), Phase 10
  (the visual redesign itself — dark/light, imagery, animation, header/footer), Phase 11/12 (the
  old Phase 8/9, renumbered, not dropped).
- **Content is adapted from masar-center.de's own live `/impressum` and `/privacy` pages** (fetched
  directly, not guessed), not copied wholesale — same reasoning as the SEO pass: this is the same
  legal entity (Masar UG) so the Impressum's register/contact details carry over as-is, but the
  Datenschutz (privacy policy) is **portal-specific, not a copy of the marketing site's**. The
  marketing site's policy covers a public brochure site (contact forms, Google Analytics/GTM, Meta/
  WhatsApp Business) — this portal collects a fundamentally different, more sensitive set of data
  (passports, criminal record extracts, medical reports) and, confirmed by grepping the codebase,
  has **zero analytics/tracking** anywhere. The portal's own Datenschutz names its own real
  processors (Neon, Cloudflare R2, Cloudmersive, Resend, Vercel) and its own real data categories,
  read from `prisma/schema.prisma` and `src/lib/checklists.ts` directly rather than assumed.
- **Two kinds of bilingual content, and this is a third one, deliberately not reusing either
  existing mechanism**: UI copy → `next-intl` messages; bilingual domain data → `pick()`. Long-form
  legal prose is neither — too unwieldy as ICU-templated JSON strings, and not simple label pairs
  either. `src/components/legal/{impressum,datenschutz}-{en,ar}.tsx` are plain JSX content
  components, chosen per-page via `getLocale()` the same way `/impressum/page.tsx` and
  `/datenschutz/page.tsx` pick between them — same "explicit locale, no ambient surprises" shape as
  every other bilingual component in this app, just content-shaped instead of data-shaped.
- **Cookie consent banner built ahead of actual need, at Rami's explicit request.** The portal sets
  no non-essential cookies today (only Better Auth's session cookie and the locale-preference
  cookie, both "strictly necessary"/functional and exempt from consent under GDPR/ePrivacy on their
  own) — a banner is not legally required yet. Built anyway so a future analytics addition has
  something to plug into (`hasAnalyticsConsent()` in `src/lib/cookie-consent.ts`) rather than
  needing a consent system retrofitted later. `"necessary"` and `"all"` behave identically right
  now — there is nothing optional to withhold yet.
  - Same pattern as `LocaleSwitcher`/`setLocale`: a Server Action sets a plain cookie
    (`src/lib/actions/cookie-consent.ts`), the client component calls it then `router.refresh()`
    — no local dismissed-state to keep in sync with the real cookie, the server-read prop is the
    only source of truth (`CookieConsentBanner`'s `initialConsent`, read in the root layout).
  - **"Cookie settings"** in the footer (`CookieSettingsLink`) just deletes the cookie server-side
    and refreshes — confirmed live that this makes the banner reappear correctly, both from a fresh
    "Accept all" state and from a fresh page load.
- **Legal links wired into every layout, not just the home page** — German Impressumspflicht
  requires the Impressum reachable within ~2 clicks from anywhere on the site. Found live: only
  `home-content.tsx`'s own footer had them (a `TODO` comment sitting there since Phase 3/4);
  `(app)/layout.tsx` and `(auth)/layout.tsx` had no footer at all. Extracted the shared bit into
  `LegalFooter` (`src/components/legal-footer.tsx`, explicit `locale` prop, same convention as
  every other component `home-content.tsx` renders) and added a footer to all three layouts.
  Deliberately **not** added to `admin/layout.tsx` — same "admin is a different, staff-only,
  out-of-scope lane" reasoning already applied to i18n; it's gated behind auth+role, not a publicly
  reachable page Impressumspflicht is aimed at.
- **Three real, unresolved gaps flagged in the policy text itself, not silently glossed over**
  (Section 4's gap closed the same week — see "Sensitive-document consent checkbox" below):
  1. Section 6 names Cloudmersive and Resend as processors without a confirmed data-processing
     region — unlike Neon/R2/Vercel, which this project's own env config and CLAUDE.md already
     pin to the EU. Worth confirming both have a signed DPA and, if they process outside the
     EU/EEA, that Standard Contractual Clauses are actually in place — the policy text says this is
     relied on, so it needs to be true, not just written.
  2. **Also flagged, not resolved**: the Impressum's "Represented by" lists only Morhaf Esmail as
     Geschäftsführer, matching the source page exactly — even though masar-center.de's own "About
     us" page names Rami as a co-founder too. Left as the one name that matches the legally filed
     register entry rather than the marketing copy; worth Rami confirming this is still accurate.
  3. No VAT ID (USt-IdNr.) appears on the source Impressum, only a Steuernummer — consistent with
     small-business (§19 UStG) status, but not verified, just carried over as-is.
- Verified live against a real production build (`next build` + `next start`), not dev mode: both
  pages confirmed rendering correctly in Arabic (RTL, all 12 Datenschutz sections, all Impressum
  sections) and in English (LTR); the cookie banner shows once, "Accept all" dismisses it and it
  stays dismissed across a reload, "Cookie settings" in the footer reliably reopens it; footer
  links confirmed present and correctly pointing at `/impressum`/`/datenschutz` on the home page,
  `(app)/dashboard`, and via redirect-when-signed-in on `/login` (confirming `(auth)/layout.tsx`'s
  footer too, since a signed-in visitor never actually sees the auth pages themselves).

### Sensitive-document consent checkbox (Phase 8 follow-up, Aug 2026)
- Closes gap #1 above: uploading a criminal record extract or medical report was Section 4's
  *stated* consent mechanism, but no real opt-in ever existed anywhere in the app. Scoped to
  **Medical (D16) only** — the one category that ever collects `CRIMINAL_RECORD` or
  `MEDICAL_REPORT` (checked `src/lib/checklists.ts`) — rather than a checkbox every applicant sees
  regardless of relevance.
- **One checkbox, at wizard time, not per-upload** (Rami's choice over a per-file checkbox on the
  checklist page) — added to the Medical question step (`QuestionStep`,
  `src/components/wizard/question-step.tsx`), the same step that already asks profession, rather
  than a new wizard step. `needsSensitiveDataConsent(category)` in `src/lib/wizard.ts` is the one
  place that decides which categories need it.
- **Recorded, not just gated** — `Application.sensitiveDataConsentAt DateTime?` (migration
  `add_sensitive_data_consent`). A timestamp, not a boolean, so there's an actual audit trail of
  *when* consent was given, not just that it was — matters for GDPR accountability on data this
  sensitive.
- **Set once, on the null → given transition, never overwritten.** `saveQuestionStep`
  (`src/lib/actions/wizard.ts`) only requires and only writes the checkbox when
  `sensitiveDataConsentAt` is still null; once given, later saves (e.g. changing the profession
  answer) don't force re-consent, and the checkbox comes back pre-checked and disabled
  (`sensitiveConsentGiven` prop) reflecting the stored value rather than local UI state.
- Section 4 of the Datenschutz (`datenschutz-en.tsx` / `-ar.tsx`) rewritten to describe the real
  checkbox instead of "uploading is consent," with a `#sensitive-documents` anchor the checkbox's
  label links to (same "server owns the source of truth" pattern already used for the cookie
  banner's `#cookies` anchor).
- Verified live against the dev database, in Arabic (not just typechecked): the checkbox renders
  only for a Medical draft application; submitting with a profession chosen but the box unchecked
  blocks with a field error and does not save; checking it saves, sets
  `sensitiveDataConsentAt`, and lands on the checklist; revisiting the question step afterward
  shows the checkbox pre-checked, disabled, and the previously-chosen profession still selected.

## Admin dashboard (Phase 6, Aug 2026)
- **Access is a manual DB flag, not a flow.** `role` is a real `Role` enum column (`USER` |
  `ADMIN`) on `User`, exposed as a Better Auth `additionalField`. There is no admin-invite UI —
  granting it means editing the row directly (Prisma Studio or SQL). Documented as a known gap,
  not solved this phase; fine while it's just us.
- **Route**: `src/app/admin/` (not a route group — `/admin` in the URL is the point, unlike
  `(app)`/`(auth)` which hide their segment). `admin/layout.tsx` is the security boundary,
  checking session **and** `role === "ADMIN"` — same "layout, never middleware" reasoning as
  `(app)`. A signed-out visitor goes to `/login`; a signed-in non-admin goes to `/dashboard`, not
  `/login` — they don't need telling to log in, they're already in, they just lack the role.
  `requireAdminSession()` (`src/lib/admin.ts`) re-checks independently inside every admin Server
  Action — the layout protects pages, not the actions, same principle as everywhere else in this
  app.
- **Two independent decisions, not one.** Per-document review (`reviewDocument`: APPROVED /
  REJECTED / NEEDS_REVISION + `adminNote`, only while the application is `PENDING_REVIEW`) is
  separate from the application-level decision (`decideApplication`, same three outcomes). The
  per-document note is the substantive feedback the applicant sees next to the specific file;
  the application decision is what actually moves `Application.status` and fires the email.
  Deliberately not cross-validated against each other — see Immediate next steps #3.
- **Files are never public.** The R2 bucket stays private; an admin viewing a document gets a
  10-minute presigned `GetObjectCommand` URL generated server-side at render time
  (`getDocumentDownloadUrl` in `src/lib/r2.ts`, needs `@aws-sdk/s3-request-presigner`). A copied
  link stops working on its own well before it could be reused as a standing hole into someone's
  passport scan.
- **Resubmission loop closed**: `submitApplication` (`src/lib/actions/documents.ts`) now accepts
  the same status set as uploads (`canUploadInStatus`: DRAFT, REJECTED, NEEDS_REVISION), not just
  DRAFT — previously a rejected/needs-revision application could never be resubmitted at all.
  **Caught a matching frontend bug while testing live**: the Submit button on
  `/applications/[id]` was still gated to `application.status === "DRAFT"` only, so even with the
  backend fixed, there was no button to click after a revision. Fixed to use the same
  `canUpload` check as everything else on that page.
- **Applicant-facing checklist now shows review outcomes**: each row renders the document's
  `reviewStatus` badge (when not `PENDING`) and `adminNote` (`DOCUMENT_REVIEW_STATUS_META` in
  `src/lib/document-review-status.ts`, same keyed-by-enum pattern as `APPLICATION_STATUS_META`).
  Replacing a flagged file resets both to `PENDING`/`null` (already built in Phase 5's upsert) —
  confirmed live that this clears the badge and note correctly.
- **Notification email** (`src/lib/emails/application-decision.ts`) is generic by decision type
  (Approved / Changes requested / Rejected) and does **not** carry a free-text admin message —
  deliberately no new schema field for that. Per-document `adminNote` is the one source of truth
  for "what's wrong"; the email just points back to the dashboard. A failed send never blocks or
  undoes the decision (`.catch()`, same pattern as `onExistingUserSignUp`'s mailer).
- **Verified live, full loop, not just typechecked**: submitted a real application → reviewed
  each document (one flagged NEEDS_REVISION with a note, four approved) → made the application
  decision → confirmed the applicant saw the exact note next to the exact file → replaced that
  file (note/badge cleared) → resubmitted → confirmed it landed back in the admin's Pending
  queue. Separately approved a second application and confirmed it appears under the Approved
  tab. Also confirmed the presigned download link 404s correctly on a stale key and succeeds on
  a freshly uploaded one (see the R2 bucket-rename note below — that failure was expected, not a
  bug).
- **Found mid-testing, not a code bug**: `S3_BUCKET` changed from `masar-portal-documents` to
  `masar-portal-documents-dev` at some point after Phase 5 was first tested. Documents uploaded
  under the old bucket name now 404 (`NoSuchKey`) on their presigned URL — the DB row and its
  `storageKey` are still correct, the object just isn't in the bucket the app now points at.
  Confirmed this by re-uploading fresh and getting a working link immediately. No data was lost
  in the sense that matters (all affected rows were this session's own test uploads), but this is
  worth knowing about if it ever happens against real data: **a bucket rename orphans every
  existing `storageKey`** with no migration path built for it.

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
  gate is enforced again server-side regardless. **Confirmed live** — a real application was
  submitted and correctly landed in `PENDING_REVIEW`, which correctly locked out its upload,
  replace, and delete controls (see below).
- **`deleteDocument`**: allowed in the same statuses as upload (`canUploadInStatus`). Deletes the
  `Document` row first, then best-effort deletes the R2 object — DB is the source of truth for
  "is this uploaded", so a failed storage delete leaves an orphaned object, never a wrong
  checklist. Confirmed live.
- **`deleteApplication`**: `DRAFT` only — narrower than upload/delete-document on purpose, since
  `REJECTED`/`NEEDS_REVISION` means an admin has already seen it once. Relies on the schema's
  existing `onDelete: Cascade` to remove `Document` rows, then best-effort deletes each R2
  object, then redirects to `/dashboard`. Confirmed live — the category becomes available to
  start again immediately after (the `userId_category` unique constraint frees up).
- Both delete actions use an inline two-step confirm ("Delete" → "Remove? Confirm/Cancel") built
  by hand rather than a native `confirm()` dialog or a modal library — no new UI dependency, and
  it stays keyboard/screen-reader friendly. `src/components/checklist/delete-document-control.tsx`,
  `delete-application-control.tsx`.
- **Upload is auto-submit, not click-to-submit**: the file input's `onChange` calls
  `event.currentTarget.form.requestSubmit()` — there's nothing to review before committing (no
  preview, nothing partial worth pausing on), so a separate "Upload" button was pure friction,
  worse on a phone. `UploadControl` is keyed by the current filename so a successful
  upload/replace/delete remounts it with a clean file input rather than showing a stale "chosen"
  file. `src/components/checklist/upload-control.tsx`.
- **Bilingual labels, not i18n**: each checklist row now renders `requirement.labelAr` under
  `labelEn`, wrapped in `dir="rtl"` to isolate that span's shaping — the page itself stays LTR
  until Phase 7 builds a real language switch. `labelAr` was already sitting in `checklists.ts`
  unused; this just stops discarding it.
- Cloudmersive call is a raw `fetch` (`src/lib/virus-scan.ts`), not their client SDK — one
  endpoint, not worth a generated-client dependency for.
- Verified live against the real dev database throughout (not just typechecked): create, replace
  (old object superseded, no duplicate row, counter stays correct), reject-on-bad-mime-type,
  submit, delete-document, and delete-application.

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
- `/admin` is gated by session **and** `role === "ADMIN"`, checked in the layout and
  independently re-checked in every admin Server Action (`requireAdminSession()`) — a layout
  redirect protects pages, not the Server Action HTTP endpoints themselves. See "Admin dashboard"
  below.
- The R2 bucket is never public. Admins view a document via a 10-minute presigned URL generated
  server-side, not a public bucket path or a permanent link.

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
- Social sign-in (`signIn.social`, OAuth callback error codes, default account-linking rules) —
  see "Google OAuth" above.

## Open questions for Masar
Only one left: confirm applicants do **not** upload motivation letter, Europass CV, visa
application form, blocked account, health insurance, accommodation proof, anabin/ZAB, job-search
proof, university admission — i.e. Masar prepares these. (Assumed yes, from the final
requirements table.)

## Env vars
`DATABASE_URL` (pooled), `DIRECT_URL` (unpooled), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`RESEND_API_KEY`, `EMAIL_FROM`. Logo URL is hard-coded in code (public, not secret).

Google OAuth (Phase 9): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — set in local `.env` and
verified live (see "Google OAuth" above). **Still missing from Vercel** (preview + prod) — same
shared-client values, not yet added there.

R2 / Cloudmersive (Phase 5): `S3_ENDPOINT` (full bucket URL — see the endpoint gotcha under
"Uploads"), `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
`VIRUS_SCAN_API_KEY`.

Git-ignored: `src/generated`, `.claude/skills/`, `.agents/`, `.windsurf/`, `skills-lock.json`.

**Stray var found in `.env`:** `DEBUG_TOKEN` — leftover from a `src/app/api/debug/env/route.ts`
that was added in commit `943641d` ("debug") and removed again in `dcc4e27`. The route is gone;
the env var isn't. Worth deleting from `.env` next time it's touched — not done now since it's
unused and harmless, and this session didn't go looking for it on purpose.
