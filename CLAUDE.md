# CLAUDE.md — Masar Portal

Guidance for any AI assistant working in this repository.

---

## 1. How to work with me (IMPORTANT)

I am building this project **to learn it**, not to have it written for me.

- **Do not write large blocks of finished code.** Give me instructions: what file to create, what it must do, what to run, and why.
- Explain the _reasoning_ behind a choice, not just the choice.
- When a decision is genuinely mine to make (architecture, product behaviour, trade-offs), **ask me** instead of assuming.
- Boilerplate that is identical in every project (config files, client singletons) may be given directly — but explain what it does.
- Application logic, components, and business rules: **I write those.** Give me a spec and review what I produce.
- Correct my mistakes explicitly and explain the underlying concept, so I don't repeat them.

My level: **strong frontend** (React/CSS/UI — move fast), **intermediate API**, **beginner backend** (databases, auth, server security — go slow and explain).

---

## 2. What this project is

**Masar Portal** — a document-management and onboarding web app for **Masar Center** (masar-center.de), a German visa/study consultancy.

Applicants in one of four categories sign up, complete a multi-step wizard, receive a personalised document checklist, upload files, and an admin reviews and approves / rejects / requests revisions.

**Categories:** `STUDENT`, `JOB_SEEKER`, `MEDICAL` (D16 medical adjustment), `AUSBILDUNG`.

**Users are mostly in Syria; the company is registered in Germany** → treat GDPR as applicable. Documents are highly sensitive (passports, medical reports, criminal-record certificates).

**API-first**: the backend must later power a native mobile app (React Native), so business logic belongs in API routes / server modules — never locked inside React components.

---

## 3. Stack

| Concern        | Choice                               |
| -------------- | ------------------------------------ |
| Framework      | Next.js (App Router) + TypeScript    |
| Styling        | Tailwind CSS                         |
| Database       | Neon Postgres (EU — Frankfurt)       |
| ORM            | Prisma **7**                         |
| DB driver      | `@prisma/adapter-pg` (node-postgres) |
| File storage   | Cloudflare R2 (EU jurisdiction)      |
| Virus scanning | Cloudmersive                         |
| Email          | _not yet chosen_                     |
| Auth           | _not yet chosen_                     |

Node 24. Package manager: npm.

---

## 4. Prisma 7 — read this before touching the database

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

**Two URLs, two places:**

| Location            | Env var        | Purpose                  |
| ------------------- | -------------- | ------------------------ |
| `prisma.config.ts`  | `DIRECT_URL`   | CLI: migrations, Studio  |
| `src/lib/prisma.ts` | `DATABASE_URL` | Runtime queries (pooled) |

**Never call `new PrismaClient()` outside `src/lib/prisma.ts`.** Every consumer does `import { prisma } from "@/lib/prisma"`. The singleton stashes the client on `globalThis` in development so Next.js hot-reload does not exhaust Neon's connection limit.

Schema changes: edit `schema.prisma` → `npx prisma migrate dev --name <description>` → commit the generated migration. **Never edit the database by hand in the Neon console** — the schema file is the single source of truth.

---

## 5. Project structure

```
src/
├── app/          # routes ONLY (page.tsx, layout.tsx, route.ts)
├── lib/          # prisma.ts, auth, r2, checklists, helpers
├── components/   # reusable UI
└── generated/    # Prisma client — generated, git-ignored, never edit
prisma/
├── schema.prisma
└── migrations/   # committed
```

Non-route code never goes inside `src/app`.

`@/` is an alias for `src/`.

---

## 6. Data model

Three tables so far — `users`, `applications`, `documents`.

- A **user has many applications** (one per visa category pursued). Status lives on the _application_, never on the user.
- An **application has many documents**.
- Foreign keys on the "many" side get `@@index([...])` — **never `@unique`**, which would silently force a one-to-one relation.
- All relations use `onDelete: Cascade` so deleting a user removes their data (GDPR "delete account" enforced at the database level).
- Wizard answers use a **hybrid** approach: fields common to all categories are real typed columns; category-specific answers live in the `data` JSON column.
- `scanStatus` (Cloudmersive, automatic) and `reviewStatus` (human admin) are **separate fields** — they answer different questions and must not be merged.

Primary keys are UUIDs, not sequential integers — sequential IDs leak volume and invite enumeration attacks on a portal holding passports.

---

## 7. Document checklists

Required documents per category are defined **in code** (a typed TypeScript config), not in the database — version-controlled, type-safe, and able to express conditional rules (e.g. "English B2 certificate only if the programme is taught in English").

`Document.requirementCode` is the link between an uploaded file and its checklist entry.

---

## 8. Security rules (non-negotiable)

- Secrets live in `.env`, which is git-ignored. **Never** commit credentials; never expose them to the client.
- Anything touching R2 keys, the Cloudmersive key, or the database must run **server-side only** (Server Components, Route Handlers, Server Actions). A `"use client"` file must never import them.
- Every uploaded file is validated (type + size) **on the server as well as the client** — client validation is a UX convenience, not a security control.
- Upload pipeline order: validate → **Cloudmersive scan** → only then store in R2. Never store an unscanned file in its permanent location.
- Authorisation is checked on the server for every request. Never trust an ID supplied by the client to decide what a user may see; scope every query by the authenticated user.
- Users may edit an application or replace a document **only** when its status is `REJECTED` or `NEEDS_REVISION`. Enforce this server-side.

---

## 9. Internationalisation

English (LTR) and Arabic (RTL). Language switching must not lose form state or entered data. `dir` is set once in the root layout. Design and build components RTL-safe from the start — use logical CSS properties (`ps-4`, `me-2`) rather than physical ones (`pl-4`, `mr-2`).

---

## 10. Conventions

- Commit when something **works**, with a message describing the outcome ("Add document upload validation"), not the command run.
- Generated or regenerable content is git-ignored: `node_modules`, `.next`, `src/generated`, `.claude/skills/`, `.agents/`, `.windsurf/`, `skills-lock.json`.
- Do not run `npm audit fix --force`.
- Prefer Server Components. Add `"use client"` only when a component genuinely needs state, effects, or browser APIs — and push it as far down the tree as possible.

---

## 11. Roadmap

- [x] **Phase 0** — Foundation: Next.js scaffold, Git, routing
- [x] **Phase 1** — Database: schema, Neon, Prisma client
- [ ] **Phase 2** — Auth & roles: signup, login, email verification, sessions, admin role
- [ ] **Phase 3** — Multi-step wizard: category forms, save & continue, dashboard
- [ ] **Phase 4** — Dynamic document checklists
- [ ] **Phase 5** — Secure uploads: validation → Cloudmersive → R2
- [ ] **Phase 6** — Admin dashboard: review workflow, per-file notes, notification emails
- [ ] **Phase 7** — i18n (EN/AR) & PWA
- [ ] **Phase 8** — GDPR (delete account, retention), audit logging, bulk ZIP export
- [ ] **Phase 9** — API documentation for the mobile app
