import { describe, expect, it } from 'vitest';
import {
  createLatestRequestGuard,
  dedupeTravelerResults,
  getPublicProfilePath,
} from './travelerSearch';

describe('traveler search', () => {
  it('deduplicates profiles by normalized username', () => {
    const results = dedupeTravelerResults([
      { id: 1, full_name: 'Ana One', username: '@Ana' },
      { id: 2, full_name: 'Ana Duplicate', username: 'ana' },
      { id: 3, full_name: 'Ben Two', username: 'ben' },
      { id: 4, full_name: 'Missing Username', username: '' },
    ]);

    expect(results.map((result) => result.id)).toEqual([1, 3]);
  });

  it('prevents an older request from becoming current', () => {
    const guard = createLatestRequestGuard();
    const oldRequest = guard.begin();
    const newRequest = guard.begin();

    expect(guard.isCurrent(oldRequest)).toBe(false);
    expect(guard.isCurrent(newRequest)).toBe(true);
    guard.invalidate();
    expect(guard.isCurrent(newRequest)).toBe(false);
  });

  it('builds the standalone public profile route', () => {
    expect(getPublicProfilePath('@ana maria')).toBe('/profile/ana%20maria');
  });
});
