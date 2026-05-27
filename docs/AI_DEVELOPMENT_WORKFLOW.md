# Portal Espiritual — AI Development Workflow

> **Propósito:** documentar cómo trabajamos día a día con AI assistance en
> este proyecto. Qué chats/herramientas usamos para qué, qué patrones nos
> han funcionado, qué patrones nos han mordido. Capturado al cierre de
> Phase 6 launch (2026-05-27) con evidencia concreta de S1-S10 +
> hotfix cycle.
>
> **No reemplaza** `AI_SETUP_AND_WORKFLOW.md` (donde viven los hooks, MCPs,
> recovery procedures cuando algo se rompe). Este doc es el **complemento**:
> cómo se trabaja una vez todo está set up.
>
> **Audiencia:** future-you (developer), future-Claude (cualquier modelo
> que retome contexto), JP o nuevo contributor sumándose al proyecto.

---

## 1. The ping-pong pattern (Claude.ai sparring ↔ Claude Code)

### Two distinct chat contexts, two distinct jobs

| Context | Job |
|---|---|
| **Claude.ai sparring chat** | Decisions, architecture review, document drafting, debugging stuck states, exploring tradeoffs out loud. Read-only-ish — looks at code, doesn't write to the repo. |
| **Claude Code CLI** | Execution against the repo: code mutations, file writes, test runs, deploys. Has hooks + MCPs + worktrees. |

### When to use which

**Use Claude.ai sparring when:**
- You're about to make an architectural decision and want pushback before
  committing (e.g. "should we extract this into a helper or keep it inline?").
- You're stuck and want a second opinion on tradeoffs ("router.refresh vs
  revalidatePath here?").
- You need a document drafted (spec, plan, devlog entry, backlog) and want
  to think out loud about scope before generating it.
- You're reviewing a diff from Claude Code and want to argue against it
  without touching the repo.

**Use Claude Code when:**
- Any code mutation: edit, write, refactor.
- Any test execution: vitest, tsc, build.
- Any deploy action: push, PR, branch operations.
- Any file write — even docs. The pattern is "decide in sparring, write
  via Code so the commit has hooks-validated provenance."

### The hand-off rhythm

The pattern that worked across Phase 6:

1. **Sparring chat opens the topic** with a question or a status report:
   "We're at S7 close-out. The S8 plan was generated. Want me to review
   before dispatching?"
2. **Sparring chat produces a closed prompt for Claude Code:** the full
   task description, scope boundaries, expected output, verification
   commands. Concrete enough that Claude Code can execute without
   re-asking.
3. **Claude Code executes the prompt** in the repo, pausing at human-review
   checkpoints (typically: end of each Gate task, or end of each commit
   in a hotfix). Reports diff back.
4. **Sparring chat reviews the diff,** approves or amends. If amend:
   step 2 again with the adjustment. If approve: Claude Code moves
   forward.
5. **Loop until the slice/feature closes.** Then sparring chat drafts the
   next thing (next slice, devlog entry, retro).

Concrete examples from Phase 6:
- **S10 Mini-Gate 10.9** discovered the `/login` page didn't exist (had
  been claimed in backlog as "URL hidden"). Sparring caught the
  empirical drift, paused, corrected the doc + the implementation.
- **Hotfix PR #1** Bug 1 had a "(cancela)" text already in HEAD — the
  sparring chat verified this empirically via `grep` BEFORE writing the
  plan, and the plan opens with a "Drift notes" section explicitly
  scoping Bug 1 down to "visual polish only" because the text was already
  present.
- **Hotfix Bug 3** implementer reported `DONE_WITH_CONCERNS` flagging an
  `adminId: null` workaround. Sparring caught the divergence from the
  existing pattern (`admin-sessions-remaining.test.ts` seeds an admin row),
  paused before fast-forwarding, fixed the route + test inline, then
  fast-forwarded.

---

## 2. Superpowers commands en práctica

The `obra/superpowers` plugin gives Claude Code 4 named commands we use
heavily. Each produces a different artifact and has a different mental
model.

### `/superpowers:brainstorming`

**What it produces:** a design spec in `docs/superpowers/specs/<date>-<feature>.md`.

**Mental model:** "we have a vague problem and need to make decisions to
close on a concrete approach." Brainstorming is the discovery phase.

**What it doesn't do:** generate code, generate a plan, lock decisions
that the human hasn't validated. Output is text-only.

**When to use:** at the top of any new feature where the scope, shape, or
tradeoffs are not yet decided. Phase 6 used brainstorming to decide:
single-product vs multi-product schema, magic-link vs password auth,
Stripe-direct vs Cal.com integration for mentoría, etc.

**When NOT to use:** when the scope is already clear and what you need is
an implementation plan. Skip directly to writing-plans.

### `/superpowers:writing-plans`

**What it produces:** an implementation plan in
`docs/superpowers/plans/<date>-<feature>.md` with TDD-discipline baked in,
vertical slices, and Sprint/Gate classification per task.

**Mental model:** "decisions are closed, the path is clear, we need a
step-by-step execution plan an engineer could follow."

**Phase 6 evidence:**
- Phase 6 implementation plan: 4518 lines, 10 slices (S1-S10), each task
  classified Sprint (self-verifiable, low cost) or Gate (architectural,
  needs human review). The Sprint/Gate distinction was load-bearing:
  Sprint tasks moved fast, Gates paused for diff review.
- Hotfix plan: 1005 lines, 3 tasks (one per bug), pause-at-Gate-task
  enforced by user instruction.

**TDD discipline:** every task in a plan SHOULD include the failing test
first, then implementation. When the plan skips this (e.g. for pure JSX
edits), the plan calls out why explicitly.

**Plan review is the most important step.** Reading the full plan
(not the summary) before execution catches:
- Hidden architectural assumptions (e.g. "this task assumes class X
  exists in theme; verified via grep").
- TDD shortcuts that should be expanded.
- Code snippets that won't compile (see Phase 6 lesson below).
- Verification commands that don't actually verify the goal.

### `/superpowers:subagent-driven-development`

**What it produces:** executes a plan, dispatching a fresh subagent per
task, two-stage review (spec compliance + code quality) after each.

**Mental model:** "controller orchestrates, subagents execute in isolated
worktrees, controller curates context per subagent. Fresh context per task
prevents the subagent from accumulating noise across the plan."

**The implementer-in-worktree pattern:** each subagent gets its own git
worktree (`.claude/worktrees/agent-<id>/`) so multiple subagents could
theoretically run in parallel without conflict. In practice we don't
parallelize implementer dispatches (because plan tasks are sequential),
but the worktree isolation still buys us: clean filesystem per task, easy
revert, no cross-task state pollution.

**Fast-forward merges:** after the implementer subagent commits on its
worktree branch (`worktree-agent-<id>`), the controller fast-forwards that
branch into the feature branch. Because subagents only ADD commits (no
rewrite), the merge is always FF — no force-push, no conflict.

**When to amend a commit:** the controller may detect that the
implementer's commit deviates from the plan in a way that needs
correction. Two flows:
- **Pre-FF correction:** edit files in the worktree, ask the subagent to
  re-commit. Cleanest, no history rewrite.
- **Post-FF amend:** if the FF has already happened, the controller can
  amend the now-merged commit in the feature branch. Requires user
  approval per safety harness (the classifier blocks amends of merged
  commits by default).

Both flows surfaced during Phase 6 hotfix. The user explicitly approved
the amend for the `adminId: null` correction.

### `/superpowers:requesting-code-review`

**What it produces:** a focused code-review pass by a fresh subagent, with
no context from the implementation history — pure "here is the diff, here
are the criteria, find issues."

**Mental model:** "before merging, get a second pair of eyes that hasn't
been involved in writing the code."

**When to use:** end of feature, before merging to main. Catches:
- Issues the implementer was too close to see (naming inconsistency,
  missed edge case).
- Patterns that drift from project conventions.
- Tests that exercise the wrong thing.

Phase 6 used this at S10 close-out — the review caught a stale comment
and one redundant test. Not used during the hotfix cycle because the
3-commit branch was small enough that pause-at-each-commit covered the
review need.

---

## 3. Patterns that worked (Phase 6 evidence)

### Plan review before execution

The reading-the-whole-plan step caught at least one significant issue
in every slice:
- S1: the plan's verification command for `tsx` env-loading was wrong
  (`tsx` doesn't auto-load `.env.local` — needs `--env-file=.env.local`).
- S7: the refund-reversal-bug-S7-edge-1-B runbook surfaced during plan
  review when the original plan assumed the path was unreachable.
- S10 mini-gate 10.9: the backlog claim "/login URL hidden" was
  empirically false — the page didn't exist at all. Plan review caught
  this and re-scoped 10.9 to actually create the page.
- Hotfix: drift between the smoke report ("admin shows 'active' puro")
  and the codebase reality (the `(cancela)` text was already in HEAD).

The cost of plan review is ~10-20 min per plan. The cost of executing a
bad plan is hours of cleanup. Always read the whole plan.

### Pause-at-Gates for human review of diff

Every Gate task in Phase 6 paused for sparring-chat diff review before
moving to the next task. Caught real issues every time. The
"continuous execution" mode that some workflows recommend would have
shipped at least 3 architectural drifts to main.

The pattern is: implementer reports DONE → controller fast-forwards →
sparring chat shows the user `git show <sha>` → user approves or amends
→ controller proceeds.

### Amendments to plan in dedicated commits (not squashed)

When a plan changed mid-execution (e.g. user revised Bug 1 scope from
"helper extraction" to "minimum surface"), the amendment landed as edits
to the plan file BEFORE the executor moved forward, NOT squashed into
the implementer's commit.

Effect: the plan file in `docs/superpowers/plans/` reflects what was
actually built, not what was originally drafted. Future-Claude reading
the plan post-merge gets the same context the implementer had.

### Honest test coverage

Phase 6 tests were integration-heavy (51 tests across 15 files, all
hitting real Neon DB). No unit tests — every test exercised the actual
DB / Stripe SDK / Resend mock surface.

The hotfix added 16 more tests (10 unit + 6 integration) that genuinely
proved invariants:
- UUID validation rejected the empirical inputs (`. env`,
  `../etc/passwd`) and a stderr-noise assertion locked out the postgres
  `22P02` regression.
- Optimistic write fail-closed: a forced-DB-failure test verified the
  500 + audit_log path + DB-state-untouched invariant.

The test that didn't exist (because we don't have RTL): client-component
`router.refresh()` behavior. We documented this gap explicitly and the
user owns the manual smoke on Vercel preview as compensation.

### Single-branch hotfix with multiple commits

Hotfix PR #1 was one branch (`hotfix/admin-ux-and-security`) with 5
commits, not 3 branches stacked. Decision rationale:
- The 3 fixes were related (all surfaced from one smoke session).
- A single PR is easier to review than 3 dependent PRs.
- The user could pause at each commit for diff review independently,
  which preserves the per-bug audit trail.
- Reverting requires more thought, but the bugs themselves were
  independent (could safely revert individual commits).

Pattern recommended when: multiple related fixes share a smoke session,
each fix is independent at the commit level, no fix blocks another's
merge.

---

## 4. Patterns that didn't work (Phase 6 evidence — be specific)

### Running vitest without verifying which DB `.env.local` points to

**What happened:** twice during the hotfix cycle, a vitest invocation
TRUNCATEd the production Neon `main` branch. The `ALLOW_DESTRUCTIVE_TESTS=true`
gate was set both times (we'd configured it for the legitimate test
runs), but `.env.local` still pointed at prod. Recovery: re-seed JP
admin + resend Stripe webhooks. ~30 min lost each.

**Why it was preventable:** the standing rule existed in
`docs/archive/known-issues-pre-launch.md` but lived in a doc Claude
Code doesn't auto-load. Now it's in repo `CLAUDE.md` (loaded every
session).

**Lesson:** standing rules belong in `CLAUDE.md`, not in standalone
docs. Standalone docs are reference; `CLAUDE.md` is the operational
guard rail.

### Worktree branches left in filesystem after merge

**What happened:** each subagent-driven-development dispatch created a
`.claude/worktrees/agent-<id>/` directory. By end of Phase 6 hotfix, there
were 3 of them, plus 3 stale branches (`worktree-agent-*`). They didn't
break anything but cluttered the workspace.

**Why it was preventable:** post-merge cleanup wasn't part of the
workflow. Now it's part of `CLAUDE.md` standing rules + gitignored.

**Lesson:** filesystem hygiene is part of the feature-completion
checklist. Workflow tools that produce artifacts should also be
responsible for documenting how to prune them.

### Plan TypeScript snippets that didn't compile under strict mode

**What happened:** the hotfix plan included a test snippet using
`let stderrSpy: ReturnType<typeof vi.spyOn>`. The subagent executed
the plan literally, then ran tsc and got TS2322 errors. The subagent
deviated idiomatically (extracted `makeStderrSpy()` helper + used
`vi.mocked(notFound)` instead of cast). The deviation was correct, but
the plan should have caught the issue pre-execution.

**Why it was preventable:** every code snippet in a plan should be
compiled (or at least scratch-typed) before plan-approval. For complex
mocking patterns, this is non-trivial — but cheap relative to mid-
execution drift.

**Lesson:** for plans with vitest/jest mocks, sanity-check the
strict-TS resolution of overloads BEFORE inlining the snippet into the
plan.

### Webhook URL configured with apex domain

**What happened:** Stripe webhook destination was set to
`https://portalespiritual.com.mx/api/webhooks/stripe` (apex). Vercel
returned 307 redirects to the `www` canonical, Stripe registered every
delivery as successful (200 from the redirect endpoint), the actual
handler never ran. Discovered when subscriber subscriptions weren't
updating DB.

**Why it was preventable:** the canonical URL of the production site
was already documented (`www.portalespiritual.com.mx`) but the
webhook configuration was done from memory in the Stripe Dashboard.

**Lesson:** runbook for external service configuration should list
exact URLs, not generic patterns. The fix landed in `SYSTEM_STATUS.md`
+ `runbooks/stripe-customer-portal-config.md`.

### Skipped LIVE end-to-end smoke initially

**What happened:** the launch sequence had a "PASO 4 deploy main + smoke
técnico UI-only" with TEST keys. We assumed TEST-keys-pass = LIVE-keys-
also-pass. The apex-vs-www webhook bug only surfaced AFTER the LIVE
flip because the TEST webhook destination was a different endpoint.

**Why it was preventable:** the launch sequence should have included
a LIVE-keys end-to-end smoke (with the $10 MXN temp price) BEFORE the
real revert to $2,222. We did add it later, but the lesson is: never
trust TEST-keys-only deploy as proof that LIVE keys work end-to-end.

**Lesson:** for any system with mode-switched configuration (test/live),
the smoke pass needs at least one cycle with the production-mode
configuration.

---

## 5. Tools selection guidance

### Use Claude.ai sparring for

- Decisions: architecture, tradeoffs, naming, scope boundaries.
- Debugging stuck states: "tests pass but the live behavior doesn't
  match — what am I missing?"
- Document review: "is this devlog entry capturing the right level
  of detail?"
- Unblocking: "I'm three options deep on this refactor and lost the
  thread of the original goal. Help me re-center."

### Use Claude Code for

- Any code mutation: edit, write, refactor, rename.
- Any file write — even docs. Hooks validate the write, the commit gets
  conventional-commit provenance.
- Any test execution: vitest, tsc, lint, build.
- Any deploy action: branch creation, push, PR creation, fast-forward
  merge.

### When in doubt

If the next step involves typing in the repo, that's Claude Code. If the
next step involves reading a diff and arguing about it, that's sparring.

---

## 6. References

- **`AI_SETUP_AND_WORKFLOW.md`** — where things live and how they break.
  Hooks, MCPs, CLAUDE.md, git rules, recovery when something breaks.
  This doc complements that one; read both for full picture.
- **`PROJECT_HANDOFF.md`** — first prompt for a new chat (Claude.ai or
  Claude Code). The "boot prompt" that gets the chat oriented to the
  current state of the system.
- **`SYSTEM_STATUS.md`** — operational snapshot of what's running in
  production.
- **`PHASE_6_5_BACKLOG.md`** — what's next.
- **`DEVLOG.md`** — chronological narrative of what happened.
- **Archived plans + specs** in `docs/archive/superpowers/` — reference
  for the actual decisions made during Phase 6, if you need to know
  why something is the way it is.
