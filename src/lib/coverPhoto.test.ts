import { describe, expect, it } from 'vitest';
import { getPersistedCoverReference } from './coverPhoto';

describe('trip cover persistence', () => {
  it('accepts only a non-empty server-persisted reference', () => {
    expect(getPersistedCoverReference('https://cdn.example/cover.jpg')).toBe(
      'https://cdn.example/cover.jpg',
    );
    expect(getPersistedCoverReference('')).toBeNull();
    expect(getPersistedCoverReference(undefined)).toBeNull();
  });
});
