# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 0. Start of every session — read these first

Before answering anything or touching code, read:

1. `docs/roadmap.md` — current phase, progress, and every architectural/security decision already
   made, with the reasoning behind each. **Do not re-litigate decisions recorded there.**
2. `docs/checklists-and-wizard.md` — the document checklist model and the two wizard answers that
   drive it.

These two files are the project's memory across sessions. When a phase finishes, or a decision is
made or reversed, **update `docs/roadmap.md` in the same session** — otherwise the next session
starts from stale information. This `CLAUDE.md` holds stable conventions; `docs/roadmap.md` holds
progress and the narrative of *why* things are the way they are.

---

## 1. How to work with me (IMPORTANT)

I am building this project **to learn it**, not to have it written for me.

- **Do not write large blocks of finished code.** Give me instructions: what file to create, what it must do, what to run, and why.
- Explain the _reasoning_ behind a choice, not just the choice.
- When a decision is genuinely mine to make (architecture, product behaviour, trade-offs), **ask me** instead of assuming.
- Boilerplate that is identical in every project (config files, client singletons) may be given directly — but explain what it does.
- Application logic, components, and business rules: **I write those.** Give me a spec and review what I produce.
- Correct my mistakes explicitly and explain the underlying concept, so I don't repeat them.
- At the end of a task, list the files created or changed.

My level: **strong frontend** (React/CSS/UI — move fast), **intermediate API**, **beginner backend** (databases, auth, server security — go slow and explain).

---

## 2. What this project is

**Masar Portal** — a document-management and onboarding web app for **Masar Center** (masar-center.de), a German visa/study consultancy.

Applicants in one of four categories sign up, complete a multi-step wizard, receive a personalised document checklist, upload files, and an admin reviews and approves / rejects / requests revisions.

**Categories:** `STUDENT`, `JOB_SEEKER` (branded "Chancenkarte" in the UI), `MEDICAL` (D16 medical adjustment), `AUSBILDUNG`.

**Users are mostly in Syria; the company is registered in Germany** → treat GDPR as applicable. Documents are highly sensitive (passports, medical reports, criminal-record certificates).

**API-first**: the backend must later power a native mobile app (React Native), so business logic belongs in Server Actions / server modules — never locked inside React components. See §5.

---

## 3. Commands

```bash
npm run dev         # start dev server (Turbopack)
npm run build       # prisma migrate deploy && next build — applies pending migrations, then builds
npm run build:dev   # next build only, no migration step
npm run start        # run a production build
npm run lint          # eslint
npm run typecheck     # next typegen && tsc --noEmit
```

- There is no test suite configured in this project yet.
- `src/app/sw.ts` (the service worker) is excluded from the main `tsconfig.json` and must be
  checked separately: `npx tsc --noEmit -p tsconfig.worker.json`. `npm run typecheck` alone will
  not catch a type error in it.
- Prisma CLI (see §4 before using): `npx prisma migrate dev --name <description>`,
  `npx prisma studio`, `npx prisma generate` (also runs automatically via `postinstall`).

---

## 4. Stack

| Concern        | Choice                                          |
| -------------- | ------------------------------------------------ |
| Framework      | Next.js 16 (App Router) + TypeScript              |
| Styling        | Tailwind CSS v4 + shadcn/ui (Base UI, `base-nova` style, `rtl: true`) |
| Database       | Neon Postgres (EU — Frankfurt), split prod/dev DBs |
| ORM            | Prisma **7**                                      |
| DB driver      | `@prisma/adapter-pg` (node-postgres)              |
| Auth           | Better Auth 1.7                                   |
| File storage   | Cloudflare R2 (EU jurisdiction), private bucket, presigned URLs only |
| Virus scanning | Cloudmersive (raw `fetch`, not their SDK)         |
| Email          | Resend                                            |
| i18n           | `next-intl`, cookie-based locale (no `[locale]` route segment) — see §7 |
| PWA            | `@serwist/turbopack` (not `@serwist/next` — see `docs/roadmap.md` "PWA") |

Node 24. Package manager: npm. Vercel region `fra1`; `main` = production, `develop` = preview, each with its own Neon database — see `docs/roadmap.md` "Environments".

---

## 5. Prisma 7 — read this before touching the database

Prisma 7 changed significantly from v6. **Ignore v6 tutorials and answers.**

- `schema.prisma` contains the **data model only**. The `datasource` block has **`provider` and nothing else** — no `url`, no `directUrl` (both removed in v7).
- Connection config lives in **`prisma.config.ts`** at the project root, which uses `env("DIRECT_URL")` — the CLI (migrations, Studio) needs the _unpooled_ connection.
- `prisma.config.ts` requires `import "dotenv/config"`; v7 does not auto-load `.env`.
- The runtime requires a **driver adapter**. The app connects with `DATABASE_URL` (the _pooled_ Neon connection) via `PrismaPg`.
- The generated client has **no `index.ts`**. Import from the explicit file:
  ```ts
  import { PrismaClient } from "@/generated/prisma/client";
  ```
  Types and enums (`User`, `Application`, `VisaCategory`, …) come from the same path.
- Files loaded directly by CLIs (`src/lib/auth.ts`, `src/lib/prisma.ts`) must use **relative**
  imports, not the `@/` alias — `jiti` (which the Prisma/Better Auth CLIs use to load TS) doesn't
  resolve it.

**Two URLs, two places:**

| Location            | Env var        | Purpose                  |
| ------------------- | -------------- | ------------------------ |
| `prisma.config.ts`  | `DIRECT_URL`   | CLI: migrations, Studio  |
| `src/lib/prisma.ts` | `DATABASE_URL` | Runtime queries (pooled) |

**Never call `new PrismaClient()` outside `src/lib/prisma.ts`.** Every consumer does `import { prisma } from "@/lib/prisma"`. The singleton stashes the client on `globalThis` in development so Next.js hot-reload does not exhaust Neon's connection limit.

Schema changes: edit `schema.prisma` → `npx prisma migrate dev --name <description>` → commit the generated migration. **Never edit the database by hand in the Neon console** — the schema file is the single source of truth.

Common gotchas (full list in `docs/roadmap.md` "Prisma 7 gotchas"): `P2022 column does not exist`
means a stale client (`prisma generate`, delete `.next`, restart); `P3009 failed migration` means
migration history is out of sync. Never `prisma migrate reset` against production.

---

## 6. Project structure & architecture

```
src/
├── app/                 # routes ONLY (page.tsx, layout.tsx, route.ts)
│   ├── (auth)/          # centred narrow-card layout, NO session check
│   ├── (app)/           # layout.tsx checks session — this IS the security boundary
│   ├── admin/            # real URL segment (not grouped); layout.tsx checks session + role
│   ├── api/auth/[...all]/route.ts   # Better Auth's catch-all handler
│   ├── api/cron/retention/route.ts  # Vercel Cron (03:00 daily, vercel.json) — auth'd via CRON_SECRET
│   └── [path]/route.ts  # serves the built service worker (see PWA below)
├── lib/
│   ├── actions/          # Server Actions — where business logic actually lives (see below)
│   ├── emails/            # email templates + shared layout, sent via lib/email.ts (Resend)
│   ├── prisma.ts, auth.ts, auth-client.ts, r2.ts, virus-scan.ts, uploads.ts
│   ├── checklists.ts, categories.ts, application-status.ts, document-review-status.ts
│   ├── file-signatures.ts, normalize-upload.ts   # upload pipeline internals, see §10
│   ├── audit.ts, retention.ts, account-deletion.ts  # GDPR follow-through, see §9
│   └── admin.ts, applications.ts, wizard.ts, cookie-consent.ts, utils.ts
├── i18n/                 # next-intl config — locale.ts, request.ts, pick.ts (see §7)
├── components/            # feature-grouped: ui/, admin/, auth/, checklist/, wizard/, legal/
└── generated/prisma/      # Prisma client — generated, git-ignored, never edit
prisma/
├── schema.prisma
└── migrations/            # committed
```

Non-route code never goes inside `src/app`. `@/` is an alias for `src/`.

**Security boundary is the route-group layout, not middleware** (Edge has no Prisma access, and
middleware is more exposed to header-based bypass patterns) — `(app)/layout.tsx` checks the
session; `admin/layout.tsx` checks session **and** `role === "ADMIN"`. Any page added under
`(app)` is protected by construction. Layouts only protect *pages* — every admin Server Action
independently re-checks via `requireAdminSession()` in `src/lib/admin.ts`, since the layout never
runs for a direct Server Action call.

**Business logic lives in `src/lib/actions/*.ts` as Server Actions**, not inside components — this
is what makes the app API-first per §2: `documents.ts` (the upload/replace/delete/submit
pipeline), `applications.ts`, `wizard.ts`, `admin.ts` (review + decide), `locale.ts`,
`cookie-consent.ts`. Pages and client components call these; they never talk to Prisma, R2, or
Cloudmersive directly.

`src/lib/checklists.ts`, `categories.ts`, `application-status.ts`, `document-review-status.ts`
follow the same shape: an enum-keyed metadata object holding `labelEn`/`labelAr` (and for
checklists, `required`/`appliesTo`) — the single source of truth for both display and logic, read
via `pick()` from `src/i18n/pick.ts` (see §7).

---

## 7. Internationalisation

English (LTR) and Arabic (RTL), via `next-intl` with **no `[locale]` route segment** — locale
lives in a cookie (`src/i18n/locale.ts`), read server-side in `src/i18n/request.ts`. This keeps
one URL for both languages, which is what makes "switching language must not lose form state"
possible without extra engineering. `/ar` is the one deliberate exception (a static, hardcoded-
Arabic mirror of the home page for link previews) — see `docs/roadmap.md` "SEO" for why.

Two distinct bilingual mechanisms — don't conflate them:
- **UI copy** (labels, buttons, headings) → `next-intl` messages, `messages/en.json` /
  `messages/ar.json`, via `useTranslations`/`getTranslations`. Both files must stay in lockstep
  (same key set) — a missing key throws at render time.
- **Bilingual domain data** with a stable identity (checklist requirements, category names,
  status labels) → `labelEn`/`labelAr` fields selected via `pick(locale, en, ar)`
  (`src/i18n/pick.ts`). Plain data selection, not ICU-templated — a different mechanism from
  `next-intl` on purpose.

`dir` is set once on `<html>` in the root layout from the locale cookie. Design and build
components RTL-safe from the start — use logical CSS properties (`ps-4`, `me-2`, `text-start`)
rather than physical ones (`pl-4`, `mr-2`). `/admin` is a deliberate exception: pinned
English + `dir="ltr"` always, regardless of the visitor's locale — it's a staff-only internal
tool, out of scope for translation.

Server Action-returned error strings and Better Auth's own error messages are **not** translated
yet (only client-side static copy is) — see `docs/roadmap.md` "i18n" for the reasoning.

---

## 8. Document checklists

Required documents per category are defined **in code** (`src/lib/checklists.ts`, a typed
TypeScript config), not in the database — version-controlled, type-safe, and able to express
conditional rules via `required: boolean` + `appliesTo?: (answers) => boolean` (e.g. an English
certificate is required only when the programme is taught in English; a "not applicable" item and
an "optional" item must not be counted the same way by the progress counter).

`Document.requirementCode` is the link between an uploaded file and its checklist entry.
`Document` has `@@unique([applicationId, requirementCode])` — a re-upload is an **upsert**
(version increments, review status resets), not a second row. See `docs/checklists-and-wizard.md`
for the full per-category document tables and the two wizard answers (`instructionLanguage`,
`medicalProfession`) that drive conditional requirements.

---

## 9. Data model

Seven tables — `users`, `applications`, `documents`, `audit_logs`, plus Better Auth's `sessions`,
`accounts`, `verifications`.

- A **user has many applications** (one per visa category pursued, enforced by
  `@@unique([userId, category])`). Status lives on the _application_, never on the user.
- An **application has many documents**.
- Foreign keys on the "many" side get `@@index([...])` or a leading-column composite `@@unique`
  — **never a bare `@unique`**, which would silently force a one-to-one relation.
- All relations use `onDelete: Cascade` so deleting a user removes their data (GDPR "delete
  account" enforced at the database level; the R2 objects themselves are cleaned up first by
  `src/lib/account-deletion.ts`, since cascading the DB rows doesn't touch storage).
- **`AuditLog` is the one deliberate exception to cascading deletes.** `actorUserId` /
  `subjectUserId` / `targetType` + `targetId` are plain strings, not foreign keys, specifically so
  that deleting a user does not erase the record that an admin once opened their passport —
  defensible under GDPR Art. 17(3)(b) because the row holds no personal data once the id it
  references is gone. Written by `src/lib/audit.ts`'s `recordAudit()`, which **never throws** — an
  audit write failing must not roll back the action it's recording. Covers document downloads,
  review decisions, application exports, account deletion, and the nightly retention purge (see
  §3's `/api/cron/retention`, `DOCUMENT_RETENTION_DAYS` — details in `docs/roadmap.md` "Audit log,
  export & retention").
- Wizard answers use a **hybrid** approach: fields common to all categories are real typed
  columns (`fullNameLatin`, `passportNumber`, `passportExpiry`); category-specific answers live in
  the `data` JSON column.
- `scanStatus` (Cloudmersive, automatic) and `reviewStatus` (human admin) are **separate fields**
  — they answer different questions and must not be merged.
- `User.role` and `User.locale` are Better Auth `additionalFields` with **`input: false`** —
  otherwise a client could set `role: "ADMIN"` at signup.

Primary keys are UUIDs, not sequential integers — sequential IDs leak volume and invite
enumeration attacks on a portal holding passports.

---

## 10. Security rules (non-negotiable)

- Secrets live in `.env`, which is git-ignored. **Never** commit credentials; never expose them to the client.
- Anything touching R2 keys, the Cloudmersive key, or the database must run **server-side only** (Server Components, Route Handlers, Server Actions). A `"use client"` file must never import them.
- Every uploaded file is validated (type + size) **on the server as well as the client** — client validation is a UX convenience, not a security control. Type is never trusted from `file.type` or the client's `Content-Type`: `src/lib/file-signatures.ts` detects the real type from the file's leading bytes (magic numbers), and only PDF/JPEG/PNG pass.
- **Uploads go straight from the browser to an R2 `quarantine/` key** (presigned PUT, `createUploadTicket` in `src/lib/actions/documents.ts`) — Vercel rejects request bodies over 4.5 MB at the edge, so a large document can't reach a Server Action at all. `finalizeUpload` then pulls the object back server-side and runs the real pipeline: validate (magic bytes) → normalize (re-encode images; also what gets them under the scanner's size limit) → **Cloudmersive scan** → store at the permanent key → delete the quarantine object (in a `finally`, on every path — success, rejection, or crash). Never store an unscanned file at its permanent key. Full design in `docs/roadmap.md` "Presigned direct-to-R2 upload".
- **The quarantine key must be checked against the caller's own application id before `finalizeUpload` trusts it** — without that check, any signed-in user could pass someone else's quarantine key and have that person's document promoted into their own application.
- Authorisation is checked on the server for every request. Never trust an ID supplied by the client to decide what a user may see; scope every query by the authenticated user's session.
- Users may edit an application or replace a document **only** when its status is `DRAFT`, `REJECTED`, or `NEEDS_REVISION` — never `PENDING_REVIEW` or `APPROVED`. Enforce this server-side (`canUploadInStatus()` in `src/lib/uploads.ts`).
- The R2 bucket is never public. Files are served via short-lived (10-minute) presigned URLs generated server-side, not a public path or a permanent link.
- Login, forgot-password, and signup responses must be identical for existing vs. non-existing accounts — no account enumeration. On this app, that leaks who is applying for a German visa. See `docs/roadmap.md` "Signup enumeration" for a real leak that was found and fixed this way.

---

## 11. Conventions

- Commit when something **works**, with a message describing the outcome ("Add document upload validation"), not the command run.
- Generated or regenerable content is git-ignored: `node_modules`, `.next`, `src/generated`, `.claude/skills/`, `.agents/`, `.windsurf/`, `skills-lock.json`.
- Do not run `npm audit fix --force`.
- Prefer Server Components. Add `"use client"` only when a component genuinely needs state, effects, or browser APIs — and push it as far down the tree as possible.
