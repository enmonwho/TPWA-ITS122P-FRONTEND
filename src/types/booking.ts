/**
 * Booking status workflow states defined in the backend API.
 */
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

/**
 * Booking model representing a reservation for an activity or trip.
 */
export interface Booking {
  id: number;
  user_id: number;
  activity_id: number;
  trip_id?: number;
  status: BookingStatus;
  total_price?: number | string;
  booking_date?: string;
  created_at?: string;
  activity_title?: string;
  vendor_name?: string;
  customer_name?: string;
  customer_email?: string;
}

/**
 * Bookable activity catalog item from the backend.
 */
export interface Activity {
  id: number;
  destination_id?: number;
  category_id?: number;
  vendor_id?: number;
  title: string;
  start_time?: string;
  end_time?: string;
  cost: number | string;
}

/**
 * Payload to create a new booking request.
 */
export interface BookingCreatePayload {
  activity_id: number;
  trip_id?: number;
  booking_date?: string;
  total_price?: number;
}
