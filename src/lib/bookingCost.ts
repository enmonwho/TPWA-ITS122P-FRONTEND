import type { Booking } from '../types/booking';

/** Prefer the backend-resolved stored booking cost over legacy aliases. */
export function getBookingCost(
  booking: Pick<Booking, 'booking_cost' | 'cost' | 'total_price'>,
) {
  return booking.booking_cost ?? booking.cost ?? booking.total_price;
}

export function formatBookingCost(
  booking: Pick<Booking, 'booking_cost' | 'cost' | 'total_price'>,
) {
  const value = getBookingCost(booking);
  if (value == null || value === '') return 'Not provided';
  const amount = Number(value);
  return Number.isFinite(amount) ? `₱${amount.toLocaleString('en-PH')}` : 'Not provided';
}
