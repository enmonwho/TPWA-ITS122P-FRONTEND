import { describe, expect, it } from 'vitest';
import { toggleTripMenu } from './dashboardMenu';

describe('trip action menu state', () => {
  it('opens the clicked trip and toggles the same trip closed', () => {
    expect(toggleTripMenu(null, 12)).toBe(12);
    expect(toggleTripMenu(12, 12)).toBeNull();
    expect(toggleTripMenu(12, 13)).toBe(13);
  });
});
