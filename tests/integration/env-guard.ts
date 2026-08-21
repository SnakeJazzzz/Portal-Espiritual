import { checkTestDbIsolation } from '../helpers/db-guard';

// FIRST vitest setup file — MUST run before tests/integration/setup.ts and
// before any app module loads. setup.ts imports @/db/client at module top,
// and ESM import hoisting means no code inside setup.ts itself can run
// before that import creates the connection pool. This file therefore
// imports nothing from src/ and does two things at module level:
//
//   1. Guards, in order, all before any connection is possible:
//      (a) DATABASE_URL_TEST exists
//      (b) ALLOW_DESTRUCTIVE_TESTS === 'true'
//      (c) DATABASE_URL_TEST's host differs from DATABASE_URL's host
//   2. Remaps process.env.DATABASE_URL to DATABASE_URL_TEST, so every app
//      module (src/lib/env, src/db/client) transparently uses the Neon
//      test branch. There is deliberately NO fallback to DATABASE_URL.
//
// A throw here aborts the whole suite before setup.ts (and its TRUNCATEs)
// ever load.

const guard = checkTestDbIsolation(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL);

// (a) DATABASE_URL_TEST must exist — checked before the destructive-tests
// gate so the missing-var error is what surfaces when both would fire.
if (!guard.ok && guard.reason === 'missing-test-url') {
  throw new Error(guard.error);
}

// (b) explicit opt-in gate for destructive tests
if (process.env.ALLOW_DESTRUCTIVE_TESTS !== 'true') {
  throw new Error(
    [
      '',
      'Integration tests refuse to run: ALLOW_DESTRUCTIVE_TESTS env var not set.',
      '',
      'These tests TRUNCATE tables (subscribers, subscriptions, audit_log, ...) before each test.',
      'They run against the Neon test branch (DATABASE_URL_TEST), but the destructive',
      'nature still requires an explicit opt-in:',
      '',
      '  ALLOW_DESTRUCTIVE_TESTS=true node --env-file=.env.local ./node_modules/.bin/vitest run',
      '',
    ].join('\n'),
  );
}

// (c) host isolation: the test URL must not point at the production host
// (also rejects malformed URLs, where isolation cannot be verified)
if (!guard.ok) {
  throw new Error(guard.error);
}

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
