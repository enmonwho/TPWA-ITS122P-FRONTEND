import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrCreateVisitorId, isValidVisitorId } from './visitSession';
import { STORAGE_KEYS } from './constants';

describe('visitor identity', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value)),
      clear: () => values.clear(),
    });
  });

  it('creates and persists a random UUID without deriving it from browser metadata', () => {
    const visitorId = getOrCreateVisitorId();

    expect(isValidVisitorId(visitorId)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.VISITOR_ID)).toBe(visitorId);
    expect(getOrCreateVisitorId()).toBe(visitorId);
  });

  it('replaces an invalid stored visitor ID', () => {
    localStorage.setItem(STORAGE_KEYS.VISITOR_ID, 'not-a-visitor-id');

    const visitorId = getOrCreateVisitorId();

    expect(isValidVisitorId(visitorId)).toBe(true);
    expect(visitorId).not.toBe('not-a-visitor-id');
  });
});
