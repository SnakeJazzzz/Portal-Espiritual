import { describe, it, expect } from 'vitest';
import { isValidUuid } from '@/lib/uuid';

describe('isValidUuid', () => {
  it('accepts a canonical UUID v4', () => {
    expect(isValidUuid('a3bb189e-8bf9-4d8c-9f1a-1234567890ab')).toBe(true);
  });

  it('accepts a UUID with uppercase hex', () => {
    expect(isValidUuid('A3BB189E-8BF9-4D8C-9F1A-1234567890AB')).toBe(true);
  });

  it('rejects the empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });

  it('rejects the path-traversal probe ".env"', () => {
    expect(isValidUuid('.env')).toBe(false);
  });

  it('rejects "../etc/passwd" style probes', () => {
    expect(isValidUuid('../etc/passwd')).toBe(false);
  });

  it('rejects numeric-only input', () => {
    expect(isValidUuid('123')).toBe(false);
  });

  it('rejects UUID with extra trailing chars', () => {
    expect(isValidUuid('a3bb189e-8bf9-4d8c-9f1a-1234567890ab.env')).toBe(false);
  });

  it('rejects UUID with whitespace', () => {
    expect(isValidUuid(' a3bb189e-8bf9-4d8c-9f1a-1234567890ab ')).toBe(false);
  });

  it('rejects null defensively without throwing', () => {
    expect(() => isValidUuid(null as unknown as string)).not.toThrow();
    expect(isValidUuid(null as unknown as string)).toBe(false);
  });

  it('rejects undefined defensively without throwing', () => {
    expect(() => isValidUuid(undefined as unknown as string)).not.toThrow();
    expect(isValidUuid(undefined as unknown as string)).toBe(false);
  });
});
