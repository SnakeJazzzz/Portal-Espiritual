import { describe, it, expect } from 'vitest';
import { checkTestDbIsolation } from '../helpers/db-guard';

const TEST_URL = 'postgresql://user:pw@ep-test-branch-pooler.aws.neon.tech/neondb?sslmode=require';
const PROD_URL = 'postgresql://user:pw@ep-prod-branch-pooler.aws.neon.tech/neondb?sslmode=require';

describe('checkTestDbIsolation', () => {
  it('rejects when DATABASE_URL_TEST is absent', () => {
    const result = checkTestDbIsolation(undefined, PROD_URL);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.reason).toBe('missing-test-url');
    expect(result.error).toContain('DATABASE_URL_TEST');
  });

  it('rejects when DATABASE_URL_TEST is an empty string', () => {
    const result = checkTestDbIsolation('', PROD_URL);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.reason).toBe('missing-test-url');
  });

  it('rejects when both URLs point at the same host', () => {
    const sameHostDifferentCreds = 'postgresql://other:wrongpw@ep-prod-branch-pooler.aws.neon.tech/neondb';
    const result = checkTestDbIsolation(sameHostDifferentCreds, PROD_URL);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.reason).toBe('same-host');
    expect(result.error).toContain('ep-prod-branch-pooler.aws.neon.tech');
  });

  it('accepts distinct hosts', () => {
    const result = checkTestDbIsolation(TEST_URL, PROD_URL);
    expect(result).toEqual({ ok: true });
  });

  it('rejects a malformed DATABASE_URL_TEST', () => {
    const result = checkTestDbIsolation('not a url at all', PROD_URL);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.reason).toBe('malformed-test-url');
  });

  it('rejects a malformed DATABASE_URL', () => {
    const result = checkTestDbIsolation(TEST_URL, ':::garbage');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.reason).toBe('malformed-base-url');
  });

  it('accepts an absent DATABASE_URL (nothing to protect)', () => {
    const result = checkTestDbIsolation(TEST_URL, undefined);
    expect(result).toEqual({ ok: true });
  });
});
