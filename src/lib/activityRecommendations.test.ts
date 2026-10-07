import { describe, expect, it } from 'vitest';
import { isDestinationActivityRecommendation } from './activityRecommendations';

describe('destination recommendation response identification', () => {
  it('recognizes recommendation rows by their destination-less API shape', () => {
    expect(
      isDestinationActivityRecommendation({
        id: 124,
        destination_id: null,
        destination_country: 'Japan',
      }),
    ).toBe(true);
  });

  it('continues to recognize legacy negative recommendation IDs', () => {
    expect(isDestinationActivityRecommendation({ id: '-124' })).toBe(true);
  });

  it('does not treat linked destination catalog activities as recommendations', () => {
    expect(
      isDestinationActivityRecommendation({
        id: 4,
        destination_id: 12,
        destination_country: 'Japan',
      }),
    ).toBe(false);
  });
});
