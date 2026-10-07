function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

export function isBookingDateWithinTripRange(
  bookingDate: string,
  tripStartDate?: string | null,
  tripEndDate?: string | null,
): boolean {
  if (!bookingDate) return true;
  if (!isValidDateOnly(bookingDate)) return false;
  if (!tripStartDate || !tripEndDate) return true;
  if (!isValidDateOnly(tripStartDate) || !isValidDateOnly(tripEndDate)) return false;
  return bookingDate >= tripStartDate && bookingDate <= tripEndDate;
}
