export type DbGuardResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'missing-test-url' | 'malformed-test-url' | 'malformed-base-url' | 'same-host';
      error: string;
    };

function parseHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Decides whether the integration suite may run against `testUrl`.
 * Pure: receives both URLs, opens no connections, reads no env.
 *
 * Rules:
 * - `testUrl` must be present and parseable.
 * - If `baseUrl` (the production DATABASE_URL) is present, it must be
 *   parseable and its hostname must DIFFER from `testUrl`'s — same host
 *   means the "test" URL points at the production server.
 * - An absent `baseUrl` is OK: there is no production target to protect.
 */
export function checkTestDbIsolation(
  testUrl: string | undefined,
  baseUrl: string | undefined,
): DbGuardResult {
  if (!testUrl) {
    return {
      ok: false,
      reason: 'missing-test-url',
      error:
        'DATABASE_URL_TEST is not set. Integration tests refuse to run without a dedicated test database branch. ' +
        'Add DATABASE_URL_TEST to .env.local (Neon "test" branch) and run with: ' +
        'ALLOW_DESTRUCTIVE_TESTS=true node --env-file=.env.local ./node_modules/.bin/vitest run',
    };
  }

  const testHost = parseHost(testUrl);
  if (testHost === null) {
    return {
      ok: false,
      reason: 'malformed-test-url',
      error: 'DATABASE_URL_TEST is not a valid URL — cannot verify it points away from production.',
    };
  }

  if (baseUrl !== undefined && baseUrl !== '') {
    const baseHost = parseHost(baseUrl);
    if (baseHost === null) {
      return {
        ok: false,
        reason: 'malformed-base-url',
        error: 'DATABASE_URL is not a valid URL — cannot verify DATABASE_URL_TEST points away from it.',
      };
    }
    if (testHost === baseHost) {
      return {
        ok: false,
        reason: 'same-host',
        error:
          `DATABASE_URL_TEST resolves to the SAME host as DATABASE_URL (${testHost}). ` +
          'The integration suite TRUNCATEs tables — running it against the production host is forbidden. ' +
          'Point DATABASE_URL_TEST at the dedicated Neon test branch.',
      };
    }
  }

  return { ok: true };
}
