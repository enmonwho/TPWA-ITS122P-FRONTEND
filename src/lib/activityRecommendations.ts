interface DestinationActivityCandidate {
  id: number | string;
  destination_id?: number | string | null;
  destination_country?: string | null;
}

/**
 * Destination-scoped API results include recommendation rows with no linked
 * destination record. Negative IDs remain supported for older API responses.
 */
export function isDestinationActivityRecommendation(
  activity: DestinationActivityCandidate,
): boolean {
  return (
    Number(activity.id) < 0 ||
    (activity.destination_id == null && Boolean(activity.destination_country?.trim()))
  );
}
