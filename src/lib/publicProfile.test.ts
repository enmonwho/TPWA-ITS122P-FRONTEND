import { describe, expect, it } from 'vitest';
import { sanitizePublicProfile } from './publicProfile';
import type { PublicProfileResponse } from '../services/api';

const trip = {
  id: 1,
  name: 'Public trip',
  startDate: '2026-01-01',
  endDate: '2026-01-02',
  totalBudget: 0,
  status: 'planning' as const,
  countries: [],
  countryRoute: [],
  travelType: '',
  nights: 1,
};

describe('public profile privacy', () => {
  it('keeps only trips explicitly marked public', () => {
    const raw = {
      id: 5,
      full_name: 'Traveler',
      username: 'traveler',
      trips: [
        { ...trip, visibility: 'public' },
        { ...trip, id: 2, visibility: 'private' },
        { ...trip, id: 3 },
      ],
      private_bookings: ['must not leak'],
    } as PublicProfileResponse & { private_bookings: string[] };

    const safe = sanitizePublicProfile(raw);
    expect(safe.trips?.map((item) => item.id)).toEqual([1]);
    expect('private_bookings' in safe).toBe(false);
  });
});
