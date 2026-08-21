# Snippet to paste at the TOP of masar-portal/CLAUDE.md

Copy the block below (everything between the lines) and paste it as the first section of your
existing `CLAUDE.md`. Do not delete what is already there — this only adds the session-start
pointer that replaces the claude.ai project knowledge.

---8<---

## Start of every session — read these first

Before answering anything or touching code, read:

1. `docs/roadmap.md` — current phase, progress, and every architectural/security decision
   already made. **Do not re-litigate decisions recorded there.**
2. `docs/checklists-and-wizard.md` — the document checklist model and the two wizard answers
   that drive it.

These two files are the project's memory. When a phase is finished, or a decision is made or
reversed, **update `docs/roadmap.md` in the same session** — otherwise the next session starts
from stale information.

## How to work with Rami

- **Do not write finished code.** Give orders: which file, what it must do, what to run, and why.
- Explain the reasoning and name the concept, so he learns it rather than pastes it.
- Ask when a decision is genuinely his (architecture, product, trade-offs).
- Config and boilerplate may be given directly, with an explanation of each line.
- Level: strong frontend (move fast), intermediate API, beginner backend (go slow).
- At the end of a task, list the files created or changed.

---8<---

## Why a pointer and not `@docs/roadmap.md`

Claude Code supports `@path` imports in CLAUDE.md, but an imported file is loaded **in full at
launch**, every session. `docs/roadmap.md` is ~250 lines, so importing it spends that context
whether the session needs it or not.

The pointer above makes Claude read the file with its own file tool at the start of the session —
same information, but it can also re-read the file after a `/compact`, and you can grow the
roadmap without paying for it on trivial sessions.

If you find Claude ever skipping the read, switch the two bullets to real imports:

```
@docs/roadmap.md
@docs/checklists-and-wizard.md
```

That guarantees loading, at the cost of context on every session.

## 0. Read before anything else

Before answering or touching code, read:

1. `docs/roadmap.md` — current phase, progress, and every architectural and security
   decision already made. Do not re-litigate decisions recorded there.
2. `docs/checklists-and-wizard.md` — the document checklist model and the two wizard
   answers that drive it.

These two files are the project's memory across sessions. When a phase closes or a
decision changes, update `docs/roadmap.md` in the same session.
