# Known issues — pre-launch (Phase 6)

Living list of bugs and risks discovered while shipping Phase 6 that have
either been temp-fixed in place or deferred to Phase 6.5. Each entry has
trigger, current state, and follow-up.

---

## 1. Integration tests destructively TRUNCATE the shared production DB

**Severity:** critical — caused production data loss (admin row, subscribers)
during pre-launch smoke prep.

### Root cause

The project runs against a single Neon database with one branch (`main`),
shared between local dev, the Vercel preview, and Vercel production
(documented in `PROJECT_HANDOFF.md`). The integration tests in
`tests/integration/` connect via `DATABASE_URL` from `.env.local`, which
points at that same shared branch.

`tests/integration/setup.ts` runs in a vitest `beforeEach` and executes:

```sql
TRUNCATE audit_log, sessions, stripe_events, auth_tokens,
         subscriptions, subscribers, rate_limit_attempts, waitlist CASCADE;
```

Any invocation of `vitest run` (directly, or via `npm test`, or by an AI
agent / new dev / CI run) wipes production state on every test. The bug
already surfaced once: the admin row for Juan Pablo had to be re-seeded
after a local `vitest run`.

### Temp fix landed in this commit

1. **`tests/integration/setup.ts`** — `beforeAll` now throws unless
   `ALLOW_DESTRUCTIVE_TESTS=true` is set. The throw aborts the vitest
   suite **before** `beforeEach` registers, so no TRUNCATE fires. The
   error message instructs the dev how to opt in safely.
2. **`scripts/test-db-reset.ts`** — committable helper for manual reset.
   Same env-var gate. Prints the DB host before truncating so the dev can
   eyeball that they are not pointing at prod.
3. **In-test `afterEach` cleanups** (`tests/integration/admin-cancel.test.ts`,
   `tests/integration/admin-sessions-remaining.test.ts`) — left untouched.
   These `db.delete(...)` calls are scoped via `WHERE` to test-fixture
   IDs (`sub_admin_cancel_test`, `admincancel@example.com`,
   `adminId='00000000-0000-0000-0000-000000000aaa'`). They only fire if
   the suite actually runs, which now requires the explicit env var.
   Lower risk; revisit in Phase 6.5 when the split lands.

### Permanent fix — Phase 6.5

Split production data away from the test DB. Two viable approaches:

- **A.** New Neon **branch** (`tests`) with the same schema but no production
  data. Add `DATABASE_URL_TEST` to `.env.local` and Vercel envs. Update
  `tests/integration/setup.ts` to use `DATABASE_URL_TEST` instead of
  `DATABASE_URL`. Remove the `ALLOW_DESTRUCTIVE_TESTS` gate (or keep it as
  a belt-and-suspenders safety check that `DATABASE_URL_TEST` is set and
  is not equal to `DATABASE_URL`).
- **B.** Move tests to a containerized Postgres (Docker, or vitest-managed
  pglite). No remote DB at all for tests. Higher infra change, simpler
  invariant.

Approach A is the minimum viable; B is the long-term ergonomic answer.
Open question for Phase 6.5: which one + when. Track in the Phase 6.5
backlog (`docs/PHASE_6_PROGRESS.md`).

### Standing rule until 6.5 lands

- **Do not run `vitest run` / `npm test` against `.env.local` without
  first confirming `DATABASE_URL` does not point to the production DB.**
- The env-var gate is a tripwire, not a guarantee. A dev who knows the
  gate exists could still set the var without checking the DB host. The
  gate is meant to catch the *accidental* invocation, not the *malicious*
  one.
- When in doubt: run `npx tsx scripts/test-db-reset.ts` (without the env
  var). It prints the DB host and refuses to truncate, so it doubles as a
  visual confirmation step.

---
