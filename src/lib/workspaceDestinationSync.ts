import { STORAGE_KEYS } from './constants';
import { getCountryId, getCountryName } from './countries';
import { destinationsApi } from '../services/api';

export interface WorkspaceDestinationSyncItem {
  id: string;
  name: string;
  countryId: string;
  country?: string;
  regionHint?: string;
  days?: number;
  accommodationId?: number | null;
  accommodation?: string | null;
  activities?: string;
  transportation?: string;
  latitude?: number;
  longitude?: number;
}

interface SyncQueue {
  pending: {
    snapshot: WorkspaceDestinationSyncItem[];
    waiters: Array<{ resolve: () => void; reject: (error: unknown) => void }>;
  } | null;
  running: boolean;
}

const queues = new Map<string, SyncQueue>();

async function syncSnapshot(
  tripId: string,
  snapshot: WorkspaceDestinationSyncItem[],
  isLatest: () => boolean,
) {
  const serverRows = await destinationsApi.getByTripIdStrict(tripId);
  let idMap: Record<string, string> = {};
  try {
    idMap = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.WORKSPACE_DESTINATION_IDS(tripId)) || '{}',
    );
  } catch {
    idMap = {};
  }

  const retainedBackendIds = new Set<string>();
  for (const [order, destination] of snapshot.entries()) {
    const country = destination.country || getCountryName(destination.countryId);
    const payload: Parameters<typeof destinationsApi.create>[0] = {
      trip_id: tripId,
      location_name: destination.name,
      latitude: destination.latitude,
      longitude: destination.longitude,
      order_sequence: order + 1,
      country,
      ...(destination.regionHint ? { region_hint: destination.regionHint } : {}),
      days: Number(destination.days) || 1,
      activities: destination.activities || '',
      transportation: destination.transportation || '',
    };
    if (destination.accommodationId != null) {
      payload.accommodation_id = destination.accommodationId;
    } else if (destination.accommodationId === null && !destination.accommodation) {
      payload.accommodation_id = null;
    } else if (destination.accommodation) {
      // Preserve text-only legacy accommodation rows without fabricating a property ID.
      payload.accommodation = destination.accommodation;
    } else {
      payload.accommodation_id = null;
    }

    const mappedId = idMap[destination.id] || destination.id;
    const existing = serverRows.find((row) => String(row.id) === String(mappedId));
    if (existing) {
      await destinationsApi.update(existing.id, payload);
      idMap[destination.id] = String(existing.id);
      retainedBackendIds.add(String(existing.id));
      continue;
    }

    const nameKey = destination.name.trim().toLowerCase();
    const countryKey = getCountryId(country);
    const matchingLegacyRow = serverRows.find(
      (row) =>
        !retainedBackendIds.has(String(row.id)) &&
        row.location_name.trim().toLowerCase() === nameKey &&
        getCountryId(row.country || '') === countryKey,
    );
    if (matchingLegacyRow) {
      await destinationsApi.update(matchingLegacyRow.id, payload);
      idMap[destination.id] = String(matchingLegacyRow.id);
      retainedBackendIds.add(String(matchingLegacyRow.id));
      continue;
    }

    const created = await destinationsApi.create(payload);
    idMap[destination.id] = String(created.id);
    retainedBackendIds.add(String(created.id));
  }

  const desiredLocalIds = new Set(snapshot.map((destination) => destination.id));
  const deletedBackendIds = new Set<string>();
  for (const [localId, backendId] of Object.entries(idMap)) {
    if (desiredLocalIds.has(localId)) continue;
    if (retainedBackendIds.has(String(backendId))) {
      delete idMap[localId];
      continue;
    }
    if (deletedBackendIds.has(String(backendId))) {
      delete idMap[localId];
      continue;
    }
    const existsOnServer = serverRows.some((row) => String(row.id) === String(backendId));
    if (existsOnServer) await destinationsApi.delete(backendId);
    deletedBackendIds.add(String(backendId));
    delete idMap[localId];
  }

  localStorage.setItem(
    STORAGE_KEYS.WORKSPACE_DESTINATION_IDS(tripId),
    JSON.stringify(idMap),
  );
  if (isLatest()) {
    localStorage.setItem(STORAGE_KEYS.WORKSPACE_DESTINATIONS_MIGRATED(tripId), 'true');
  }
}

export function enqueueWorkspaceDestinationSync(
  tripId: string,
  snapshot: WorkspaceDestinationSyncItem[],
): Promise<void> {
  let queue = queues.get(tripId);
  if (!queue) {
    queue = { pending: null, running: false };
    queues.set(tripId, queue);
  }
  const syncPromise = new Promise<void>((resolve, reject) => {
    const existingWaiters = queue?.pending?.waiters || [];
    queue!.pending = {
      snapshot,
      waiters: [...existingWaiters, { resolve, reject }],
    };
  });

  if (queue.running) return syncPromise;

  queue.running = true;
  void (async () => {
    while (queue?.pending) {
      const next = queue.pending;
      queue.pending = null;
      try {
        await syncSnapshot(tripId, next.snapshot, () => queue?.pending === null);
        next.waiters.forEach(({ resolve }) => resolve());
      } catch (error) {
        next.waiters.forEach(({ reject }) => reject(error));
      }
    }
    queue.running = false;
    if (!queue.pending) queues.delete(tripId);
  })();

  return syncPromise;
}
