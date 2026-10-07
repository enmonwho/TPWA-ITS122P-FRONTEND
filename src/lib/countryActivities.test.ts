import { describe, expect, it } from 'vitest';
import { buildActivityOptionsByCountry } from './countryActivities';

describe('buildActivityOptionsByCountry', () => {
  it('uses activity destination relationships to keep country options isolated', () => {
    const options = buildActivityOptionsByCountry(
      [
        { id: 10, trip_id: 1, location_name: 'Jeju Island', country: 'South Korea' },
        { id: 11, trip_id: 1, location_name: 'El Nido', country: 'Philippines' },
      ],
      [
        { id: 1, destination_id: 10, title: 'Jeju Coastal Tour', cost: 0 },
        { id: 2, destination_id: 11, title: 'El Nido Island Hopping', cost: 0 },
        { id: 3, title: 'Unlinked Activity', cost: 0 },
      ],
    );

    expect(options['south-korea']).toContain('Jeju Coastal Tour');
    expect(options['south-korea']).toContain('Shopping & Night Markets');
    expect(options.philippines).toContain('El Nido Island Hopping');
    expect(options['south-korea']).not.toContain('El Nido Island Hopping');
    expect(Object.hasOwn(options, '')).toBe(false);
  });

  it('omits activities whose destination has an unknown country', () => {
    const options = buildActivityOptionsByCountry(
      [{ id: 1, trip_id: 2, location_name: 'Somewhere', country: 'Unknown Place' }],
      [{ id: 1, destination_id: 1, title: 'Unmapped', cost: 0 }],
    );

    expect(options['unknown-place']).toBeUndefined();
  });
});
