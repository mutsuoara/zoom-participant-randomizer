import { describe, it, expect } from 'vitest';
import { toUrlSafeId } from '../meetingId.js';

describe('toUrlSafeId', () => {
  it('replaces + with -', () => {
    expect(toUrlSafeId('abc+def')).toBe('abc-def');
  });

  it('replaces / with _', () => {
    expect(toUrlSafeId('abc/def')).toBe('abc_def');
  });

  it('strips = padding', () => {
    expect(toUrlSafeId('abc==')).toBe('abc');
  });

  it('handles all special chars together', () => {
    expect(toUrlSafeId('a+b/c=d==')).toBe('a-b_cd');
  });

  it('leaves already-safe strings unchanged', () => {
    expect(toUrlSafeId('abcdef123')).toBe('abcdef123');
  });
});
