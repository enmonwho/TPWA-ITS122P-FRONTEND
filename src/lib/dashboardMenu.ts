export type TripMenuId = string | number | null;

export function toggleTripMenu(current: TripMenuId, clicked: Exclude<TripMenuId, null>) {
  return current === clicked ? null : clicked;
}
