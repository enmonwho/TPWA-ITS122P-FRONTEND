import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBookingExtra,
  saveBookingExtra,
  getTripCustomBookings,
  saveTripCustomBooking,
  reconcileTripBookings,
} from './bookingExtras';
import type { Booking } from '../types/booking';

const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
});

describe('bookingExtras and persistence logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves booking extras for backend-persisted bookings', () => {
    saveBookingExtra(101, {
      trip_id: 52,
      booking_date: '2026-10-15',
      activity_id: 1,
      activity_title: 'Sagrada Familia Guided Tour',
      cost: 45,
      total_price: 45,
    });

    const retrieved = getBookingExtra(101);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.trip_id).toBe(52);
    expect(retrieved?.booking_date).toBe('2026-10-15');
    expect(retrieved?.activity_title).toBe('Sagrada Familia Guided Tour');
    expect(retrieved?.cost).toBe(45);
  });

  it('saves and retrieves custom trip reservations (e.g. hotel stays)', () => {
    const hotelBooking: Booking = {
      id: 9991,
      user_id: 2,
      trip_id: 52,
      status: 'confirmed',
      custom_title: 'Hotel Arts Barcelona',
      custom_type: 'hotel',
      custom_location: 'Marina 19-21, Barcelona',
      cost: 250,
      total_price: 250,
      booking_date: '2026-10-12',
    };

    saveTripCustomBooking(52, hotelBooking);

    const tripBookings = getTripCustomBookings(52);
    expect(tripBookings).toHaveLength(1);
    expect(tripBookings[0].custom_title).toBe('Hotel Arts Barcelona');
    expect(tripBookings[0].custom_type).toBe('hotel');
    expect(tripBookings[0].trip_id).toBe(52);
  });

  it('reconcileTripBookings merges backend bookings and custom trip reservations', () => {
    // 1. Backend booking returned from PostgreSQL GET /api/bookings (no trip_id in database schema)
    const backendBooking: Booking = {
      id: 201,
      user_id: 2,
      activity_id: 5,
      status: 'pending',
      created_at: '2026-10-03T10:00:00Z',
    };

    // 2. Extra metadata persisted on creation
    saveBookingExtra(201, {
      trip_id: 52,
      booking_date: '2026-10-14',
      activity_id: 5,
      activity_title: 'Park Güell Tour',
      cost: 30,
      total_price: 30,
    });

    // 3. Custom hotel reservation
    const customStay: Booking = {
      id: 301,
      user_id: 2,
      trip_id: 52,
      status: 'confirmed',
      custom_title: 'W Barcelona',
      custom_type: 'hotel',
      custom_location: 'Plaça Rosa Del Vents 1, Barcelona',
      cost: 320,
      total_price: 320,
      booking_date: '2026-10-12',
    };
    saveTripCustomBooking(52, customStay);

    const reconciled = reconcileTripBookings([backendBooking], 52);

    expect(reconciled).toHaveLength(2);

    // Verify hotel reservation is included
    const hotel = reconciled.find((b) => b.id === 301);
    expect(hotel).toBeDefined();
    expect(hotel?.custom_title).toBe('W Barcelona');
    expect(hotel?.custom_type).toBe('hotel');
    expect(hotel?.trip_id).toBe(52);

    // Verify backend activity booking is enriched with trip_id and metadata
    const activity = reconciled.find((b) => b.id === 201);
    expect(activity).toBeDefined();
    expect(activity?.trip_id).toBe(52);
    expect(activity?.booking_date).toBe('2026-10-14');
    expect(activity?.cost).toBe(30);
    expect(activity?.status).toBe('pending');
  });

  it('preserves trip isolation so bookings do not bleed across trips', () => {
    const spainStay: Booking = {
      id: 401,
      user_id: 2,
      trip_id: 52,
      status: 'confirmed',
      custom_title: 'Spain Boutique Hotel',
      custom_type: 'hotel',
    };
    saveTripCustomBooking(52, spainStay);

    const japanStay: Booking = {
      id: 402,
      user_id: 2,
      trip_id: 53,
      status: 'confirmed',
      custom_title: 'Tokyo Ryokan',
      custom_type: 'hotel',
    };
    saveTripCustomBooking(53, japanStay);

    // For Trip 52, only Spain stay is retrieved
    const forTrip52 = reconcileTripBookings([], 52);
    expect(forTrip52.some((b) => b.id === 401)).toBe(true);
    expect(forTrip52.some((b) => b.id === 402)).toBe(false);

    // For Trip 53, only Tokyo stay is retrieved
    const forTrip53 = reconcileTripBookings([], 53);
    expect(forTrip53.some((b) => b.id === 402)).toBe(true);
    expect(forTrip53.some((b) => b.id === 401)).toBe(false);
  });
});
