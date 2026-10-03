import { describe, expect, it, vi } from 'vitest';
import { sanitizePublicProfile, openPublicProfile } from './publicProfile';
import type { PublicProfileResponse } from '../services/api';

const baseTrip = {
  id: 1,
  name: 'Tokyo Trip',
  startDate: '2026-04-01',
  endDate: '2026-04-10',
  totalBudget: 1500,
  status: 'planning' as const,
  countries: ['Japan'],
  countryRoute: [],
  travelType: 'Solo',
  nights: 9,
};

describe('public profile privacy and sanitization', () => {
  it('keeps only trips explicitly marked public', () => {
    const raw = {
      id: 5,
      full_name: 'Ady Max',
      username: 'adiee',
      trips: [
        { ...baseTrip, id: 1, visibility: 'public' },
        { ...baseTrip, id: 2, visibility: 'private' },
        { ...baseTrip, id: 3 },
      ],
      private_bookings: ['sensitive-booking-token'],
      email: 'ady@example.com',
    } as PublicProfileResponse & { private_bookings: string[]; email: string };

    const safe = sanitizePublicProfile(raw);
    expect(safe.trips?.map((item) => item.id)).toEqual([1]);
    expect('private_bookings' in safe).toBe(false);
    expect('email' in safe).toBe(false);
  });

  it('keeps only journals explicitly marked public and excludes private journals', () => {
    const raw: PublicProfileResponse & { private_notes?: string } = {
      id: 10,
      full_name: 'Ady Max',
      username: 'adiee',
      trips: [{ ...baseTrip, id: 1, visibility: 'public' }],
      journals: [
        {
          id: 'j-pub-1',
          title: 'Kyoto in the Rain',
          content: 'A short public journal entry about temples in Kyoto.',
          createdAt: '2026-09-30T10:00:00Z',
          country: 'Japan',
          travel_type: 'Solo',
          visibility: 'public',
        },
        {
          id: 'j-priv-1',
          title: 'Private Diary',
          content: 'Private personal thoughts that should never be shown publicly.',
          createdAt: '2026-10-01T10:00:00Z',
          visibility: 'private',
        },
        {
          id: 'j-unmarked-1',
          title: 'Unmarked Entry',
          content: 'Draft without visibility.',
          createdAt: '2026-10-02T10:00:00Z',
        },
      ],
      private_notes: 'Secret notes',
    };

    const safe = sanitizePublicProfile(raw);
    expect(safe.journals).toHaveLength(1);
    expect(safe.journals?.[0].id).toBe('j-pub-1');
    expect(safe.journals?.[0].title).toBe('Kyoto in the Rain');
    expect('private_notes' in safe).toBe(false);
  });

  it('dispatches custom event to trigger profile modal', () => {
    const originalWindow = (globalThis as unknown as { window?: unknown }).window;
    const dispatchMock = vi.fn();
    (globalThis as unknown as { window: unknown }).window = {
      dispatchEvent: dispatchMock,
    };

    openPublicProfile('@adiee');
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    const eventArg = dispatchMock.mock.calls[0][0] as {
      type: string;
      detail: { username: string };
    };
    expect(eventArg.detail).toEqual({ username: 'adiee' });

    (globalThis as unknown as { window?: unknown }).window = originalWindow;
  });
});
