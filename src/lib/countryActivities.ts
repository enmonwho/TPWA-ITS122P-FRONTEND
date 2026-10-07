import type { Activity } from '../types/booking';
import type { Destination } from '../types/destination';
import { getCountryId } from './countries';
import { getCuratedActivityOptionsByCountry } from './tripAutoFill';

/**
 * Groups catalog activities by the country of their related destination.
 * Activities without a destination or canonical destination country are omitted.
 */
export function buildActivityOptionsByCountry(
  destinations: readonly Destination[],
  activities: readonly Activity[],
): Record<string, string[]> {
  const countryByDestinationId = new Map<string, string>();

  destinations.forEach((destination) => {
    const countryId = getCountryId(destination.country);
    if (countryId) countryByDestinationId.set(String(destination.id), countryId);
  });

  const options = new Map<string, Set<string>>(
    Object.entries(getCuratedActivityOptionsByCountry()).map(([countryId, values]) => [
      countryId,
      new Set(values),
    ]),
  );
  activities.forEach((activity) => {
    if (activity.destination_id == null) return;
    const countryId = countryByDestinationId.get(String(activity.destination_id));
    const title = activity.title?.trim();
    if (!countryId || !title) return;
    const countryOptions = options.get(countryId) || new Set<string>();
    countryOptions.add(title);
    options.set(countryId, countryOptions);
  });

  return Object.fromEntries(
    Array.from(options, ([countryId, countryOptions]) => [
      countryId,
      Array.from(countryOptions).sort((left, right) => left.localeCompare(right)),
    ]),
  );
}
