import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  X,
  MapPin,
  Moon,
  BedDouble,
  Sparkles,
  BusFront,
  Globe,
  Trash2,
} from 'lucide-react';
import routeIcon from '../assets/route.png';
import dayByDayIcon from '../assets/day-by-day.png';
import magnifierIcon from '../assets/magnifier.png';
import { CountryAutocomplete, GlobeMap } from '../components';
import AnchoredPopover from '../components/AnchoredPopover';
import { getCoordinatesForName } from '../constants/coordinates';
import { useAuth } from '../context/AuthContext';
import { ROUTES, STORAGE_KEYS } from '../lib/constants';
import type { Trip } from '../types/trip';
import type { Destination } from '../types/destination';
import { destinationsApi, tripsApi } from '../services/api';
import { mergeTripWithExtras, saveTripExtras } from '../lib/tripExtras';
import { enqueueWorkspaceDestinationSync } from '../lib/workspaceDestinationSync';
import { formatUserDateRange } from '../lib/formatters';
import {
  searchDestinations,
  type DestinationPlace,
  ACCOMMODATION_OPTIONS,
  ACTIVITIES_OPTIONS,
  TRANSPORTATION_OPTIONS,
} from '../lib/tripAutoFill';
import axios from 'axios';
import {
  getCountryId,
  getCountryName,
  getCountryOption,
  mergeCountryRoute,
  orderDestinationsByCountryRoute,
  removeCountryFromRoute,
  type CountryId,
  type CountryRouteEntry,
} from '../lib/countries';

export interface WorkspaceDestination {
  id: string;
  name: string;
  countryId: CountryId;
  country?: string;
  order: number;
  days?: number;
  nights?: number;
  accommodation?: string;
  activities?: string;
  transportation?: string;
  latitude?: number;
  longitude?: number;
}

function generateCustomDestId(): string {
  return `dest-custom-${Date.now()}`;
}

function getWorkspaceCoordinates(
  name: string,
  country?: string,
): [number, number] | null {
  const cityCoordinates = getCoordinatesForName(name);
  if (cityCoordinates) return cityCoordinates;

  const countryOption = getCountryOption(country);
  const countryNames = [
    countryOption?.name,
    ...(countryOption?.aliases || []),
    country,
  ].filter((value): value is string => Boolean(value));
  for (const countryName of countryNames) {
    const coordinates = getCoordinatesForName(countryName);
    if (coordinates) return coordinates;
  }
  return null;
}

export default function TripWorkspace() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const tabQuery = searchParams.get('tab');
  const activeTab = tabQuery === 'day' ? 'day' : 'route';

  const handleTabChange = (tab: 'route' | 'day') => {
    if (tab === 'day') {
      setSearchParams({ tab: 'day' });
    } else {
      setSearchParams({});
    }
  };

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isMobileAddDestOpen, setIsMobileAddDestOpen] = useState(false);
  const [mobileAddDestCountryId, setMobileAddDestCountryId] = useState<CountryId>('');
  const [mobileDestName, setMobileDestName] = useState('');

  const getDayDateString = (dayNum: number) => {
    if (!trip?.startDate) return '';
    const d = new Date(trip.startDate);
    d.setDate(d.getDate() + (dayNum - 1));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleOpenAddDestForCountry = (countryId: CountryId) => {
    setMobileAddDestCountryId(countryId);
    setMobileDestName('');
    setIsMobileAddDestOpen(true);
  };

  const [destinations, setDestinations] = useState<WorkspaceDestination[]>([]);
  const [countryRoute, setCountryRoute] = useState<CountryRouteEntry[]>([]);
  const [isAddCountryModalOpen, setIsAddCountryModalOpen] = useState(false);
  const [pendingCountryRemoval, setPendingCountryRemoval] = useState<{
    countryId: CountryId;
    countryName: string;
    destinationCount: number;
  } | null>(null);
  const [newCountrySelection, setNewCountrySelection] = useState<CountryId[]>([]);
  const [newDestInput, setNewDestInput] = useState('');
  const [selectedCountryForNew, setSelectedCountryForNew] = useState<CountryId>('');
  const [activeDestinationId, setActiveDestinationId] = useState<string | null>(null);
  const [collapsedCountries, setCollapsedCountries] = useState<Record<string, boolean>>(
    {},
  );
  const [customInputActive, setCustomInputActive] = useState<Record<string, boolean>>({});
  const [userCustomOptions, setUserCustomOptions] = useState<Record<string, string[]>>({
    accommodation: [],
    activities: [],
    transportation: [],
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const dayScheduleListRef = useRef<HTMLDivElement>(null);
  const countryRemovalDialogRef = useRef<HTMLDivElement>(null);
  const countryRemovalCancelRef = useRef<HTMLButtonElement>(null);
  const countryRemoveTriggerRef = useRef<HTMLElement | null>(null);
  const persistDestinations = useCallback(
    (updated: WorkspaceDestination[], routeOverride: CountryRouteEntry[]) => {
      if (!tripId) return;
      const normalizedRoute = mergeCountryRoute(
        routeOverride,
        updated.map((destination) => destination.countryId || destination.country || ''),
      );
      const ordered = orderDestinationsByCountryRoute(updated, normalizedRoute).map(
        (destination, order) => ({ ...destination, order }),
      );
      localStorage.setItem(`lakbye_workspace_dests_${tripId}`, JSON.stringify(ordered));
      saveTripExtras(tripId, { countryRoute: normalizedRoute });
      localStorage.setItem(STORAGE_KEYS.WORKSPACE_DESTINATIONS_MIGRATED(tripId), 'false');

      // Keep the legacy local mirror used by Budget and export while syncing the
      // canonical destination records consumed by Bookings and Map.
      enqueueWorkspaceDestinationSync(tripId, ordered);
    },
    [tripId],
  );

  useEffect(() => {
    if (!pendingCountryRemoval) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    countryRemovalCancelRef.current?.focus();

    const handleCountryRemovalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPendingCountryRemoval(null);
        return;
      }

      if (event.key !== 'Tab' || !countryRemovalDialogRef.current) return;
      const focusable = Array.from(
        countryRemovalDialogRef.current.querySelectorAll<HTMLButtonElement>(
          'button:not(:disabled)',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleCountryRemovalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleCountryRemovalKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      const trigger = countryRemoveTriggerRef.current;
      countryRemoveTriggerRef.current = null;
      if (trigger?.isConnected) {
        trigger.focus();
      }
    };
  }, [pendingCountryRemoval]);

  useEffect(() => {
    if (activeTab === 'day' && dayScheduleListRef.current) {
      dayScheduleListRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const { inRouteSuggestions, otherRouteSuggestions, outOfRouteSuggestions } =
    useMemo(() => {
      if (!newDestInput.trim() || newDestInput.trim().length < 1) {
        return {
          inRouteSuggestions: [],
          otherRouteSuggestions: [],
          outOfRouteSuggestions: [],
        };
      }
      const all = searchDestinations(newDestInput.trim(), 12);
      const routeCountryIds = new Set(countryRoute.map((country) => country.countryId));
      const selectedCountryId =
        getCountryId(selectedCountryForNew) || countryRoute[0]?.countryId || '';
      const inCountry: DestinationPlace[] = [];
      const inOtherRouteCountries: DestinationPlace[] = [];
      const outOfRoute: DestinationPlace[] = [];
      all.forEach((p) => {
        const pCountryId = getCountryId(p.country);
        if (pCountryId === selectedCountryId) {
          inCountry.push(p);
        } else if (pCountryId && routeCountryIds.has(pCountryId)) {
          inOtherRouteCountries.push(p);
        } else {
          outOfRoute.push(p);
        }
      });
      return {
        inRouteSuggestions: inCountry.slice(0, 8),
        otherRouteSuggestions: inOtherRouteCountries,
        outOfRouteSuggestions: outOfRoute,
      };
    }, [newDestInput, countryRoute, selectedCountryForNew]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedSuggestionPopover =
        target instanceof Element && target.closest('.workspace-dest-dropdown') !== null;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target) &&
        !clickedSuggestionPopover
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user || !tripId) return;
    let cancelled = false;

    const fetchTrip = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const [apiTrip, serverDestinationsResult] = await Promise.all([
          tripsApi.getTrip(tripId),
          destinationsApi.getByTripIdStrict(tripId).then(
            (rows) => ({ rows, loaded: true as const }),
            () => ({ rows: [] as Destination[], loaded: false as const }),
          ),
        ]);
        if (cancelled) return;

        const merged = mergeTripWithExtras(apiTrip);
        setTrip(merged);

        // Migrate the legacy workspace country list into the canonical route.
        let legacyWorkspaceCountries: string[] = [];
        const savedCountriesStr = localStorage.getItem(
          `lakbye_workspace_countries_${tripId}`,
        );
        if (savedCountriesStr) {
          try {
            const parsedC = JSON.parse(savedCountriesStr);
            if (Array.isArray(parsedC)) legacyWorkspaceCountries = parsedC;
          } catch {
            // ignore
          }
        }

        // Check if saved destinations exist in localStorage for this trip
        const savedDestStr = localStorage.getItem(`lakbye_workspace_dests_${tripId}`);
        let initialDests: WorkspaceDestination[] = [];
        if (savedDestStr) {
          try {
            const parsed = JSON.parse(savedDestStr);
            if (Array.isArray(parsed)) {
              initialDests = parsed
                .filter((d: any) => {
                  // Filter out legacy dummy country-as-destination rows
                  const isLegacyDummy =
                    d.name === d.country &&
                    (d.accommodation === 'Selected Hotel' ||
                      d.accommodation === 'TBD Hotel');
                  return !isLegacyDummy;
                })
                .map((d: any, index: number) => {
                  const country = getCountryOption(d.countryId || d.country || d.name);
                  return {
                    ...d,
                    countryId: country?.id || '',
                    country: country?.name || d.country || '',
                    order: Number.isFinite(Number(d.order)) ? Number(d.order) : index,
                    days: Number(d.days) || Number(d.nights) || 1,
                    accommodation:
                      d.accommodation === 'Selected Hotel' ||
                      d.accommodation === 'TBD Hotel'
                        ? ''
                        : d.accommodation || '',
                    activities:
                      d.activities === 'Sightseeing & Culture' ||
                      d.activities === 'Local Exploration'
                        ? ''
                        : d.activities || '',
                    transportation:
                      d.transportation === 'Flight / Express Train' ||
                      d.transportation === 'Train / Taxi'
                        ? ''
                        : d.transportation || '',
                  };
                });
            }
          } catch {
            initialDests = [];
          }
        }

        let destinationIdMap: Record<string, string> = {};
        try {
          const parsedIdMap = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.WORKSPACE_DESTINATION_IDS(tripId)) || '{}',
          );
          if (parsedIdMap && typeof parsedIdMap === 'object') {
            destinationIdMap = Object.fromEntries(
              Object.entries(parsedIdMap).map(([localId, backendId]) => [
                localId,
                String(backendId),
              ]),
            );
          }
        } catch {
          destinationIdMap = {};
        }

        const serverRows = serverDestinationsResult.rows;
        const migrationComplete =
          localStorage.getItem(STORAGE_KEYS.WORKSPACE_DESTINATIONS_MIGRATED(tripId)) ===
          'true';
        const matchedServerIds = new Set<string>();
        const workspaceFromServer = (destination: Destination, index: number) => {
          const country = getCountryOption(destination.country || '');
          const coords = getWorkspaceCoordinates(
            destination.location_name,
            country?.name || destination.country,
          );
          return {
            id: String(destination.id),
            name: destination.location_name,
            countryId: country?.id || '',
            country: country?.name || destination.country || '',
            order: Number.isFinite(Number(destination.order_sequence))
              ? Number(destination.order_sequence)
              : index,
            days: Number(destination.days) || 1,
            accommodation: destination.accommodation || '',
            activities: destination.activities || '',
            transportation: destination.transportation || '',
            latitude:
              destination.latitude != null ? Number(destination.latitude) : coords?.[1],
            longitude:
              destination.longitude != null ? Number(destination.longitude) : coords?.[0],
          } satisfies WorkspaceDestination;
        };

        const serverWorkspaceRows = serverRows.map(workspaceFromServer);
        if (migrationComplete && serverDestinationsResult.loaded) {
          destinationIdMap = Object.fromEntries(
            serverWorkspaceRows.map((destination) => [destination.id, destination.id]),
          );
        } else {
          serverWorkspaceRows.forEach((destination) => {
            destinationIdMap[destination.id] = destination.id;
          });
        }
        const localWorkspaceRows = initialDests.map((localDestination) => {
          const mappedId = destinationIdMap[localDestination.id] || localDestination.id;
          const byId = serverRows.find(
            (destination) =>
              String(destination.id) === mappedId &&
              !matchedServerIds.has(String(destination.id)),
          );
          const byLocation = byId
            ? undefined
            : serverRows.find((destination) => {
                const rowId = String(destination.id);
                if (matchedServerIds.has(rowId)) return false;
                const sameName =
                  destination.location_name.trim().toLowerCase() ===
                  localDestination.name.trim().toLowerCase();
                const sameCountry =
                  getCountryId(destination.country || '') === localDestination.countryId;
                return sameName && sameCountry;
              });
          const matched = byId || byLocation;
          if (!matched) return localDestination;

          matchedServerIds.add(String(matched.id));
          destinationIdMap[localDestination.id] = String(matched.id);
          const serverDestination = workspaceFromServer(
            matched,
            serverRows.indexOf(matched),
          );
          return {
            ...serverDestination,
            ...localDestination,
            id: String(matched.id),
            countryId: localDestination.countryId || serverDestination.countryId,
            country: localDestination.country || serverDestination.country,
            latitude: localDestination.latitude ?? serverDestination.latitude,
            longitude: localDestination.longitude ?? serverDestination.longitude,
          };
        });
        const remainingServerRows = serverWorkspaceRows.filter(
          (destination) => !matchedServerIds.has(destination.id),
        );
        const mergedDestinations =
          migrationComplete && serverDestinationsResult.loaded
            ? serverWorkspaceRows
            : [...localWorkspaceRows, ...remainingServerRows];

        const initialRoute = mergeCountryRoute(merged.countryRoute, [
          ...legacyWorkspaceCountries,
          ...mergedDestinations.map((destination) => destination.countryId),
        ]);
        const normalizedRoute = initialRoute;
        const orderedDestinations = orderDestinationsByCountryRoute(
          mergedDestinations,
          normalizedRoute,
        ).map((destination, order) => ({ ...destination, order }));

        setCountryRoute(normalizedRoute);
        setDestinations(orderedDestinations);
        saveTripExtras(tripId, { countryRoute: normalizedRoute });
        localStorage.setItem(
          STORAGE_KEYS.WORKSPACE_DESTINATION_IDS(tripId),
          JSON.stringify(destinationIdMap),
        );
        if (serverDestinationsResult.loaded) {
          persistDestinations(orderedDestinations, normalizedRoute);
        } else {
          localStorage.setItem(
            `lakbye_workspace_dests_${tripId}`,
            JSON.stringify(orderedDestinations),
          );
        }
        localStorage.removeItem(`lakbye_workspace_countries_${tripId}`);
        setSelectedCountryForNew(normalizedRoute[0]?.countryId || '');
        if (orderedDestinations.length > 0) {
          setActiveDestinationId(orderedDestinations[0].id);
        }
      } catch (err) {
        if (cancelled) return;
        if (
          axios.isAxiosError(err) &&
          (err.response?.status === 403 || err.response?.status === 404)
        ) {
          setNotFound(true);
        } else {
          setNotFound(true);
          console.error('Failed to fetch trip:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrip();
    return () => {
      cancelled = true;
    };
  }, [user, tripId, persistDestinations]);

  // Date picker duration in calendar days (inclusive start to end)
  const tripDurationDays = useMemo(() => {
    if (trip?.startDate && trip?.endDate) {
      const s = new Date(trip.startDate);
      const e = new Date(trip.endDate);
      s.setHours(0, 0, 0, 0);
      e.setHours(0, 0, 0, 0);
      const diffMs = e.getTime() - s.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 0) return diffDays;
    }
    if (trip?.nights) return trip.nights + 1;
    return 1;
  }, [trip?.startDate, trip?.endDate, trip?.nights]);

  // Total allocated days across all destinations
  const totalAllocatedDays = useMemo(() => {
    return destinations.reduce(
      (sum, d) => sum + (Number(d.days) || Number(d.nights) || 1),
      0,
    );
  }, [destinations]);

  const handleMobileAddDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileDestName.trim()) return;

    const name = mobileDestName.trim();
    const finalCountryId = mobileAddDestCountryId;
    const finalCountry = getCountryName(finalCountryId);
    if (!finalCountryId || !finalCountry) {
      setIsMobileAddDestOpen(false);
      setIsAddCountryModalOpen(true);
      return;
    }

    const coords = getWorkspaceCoordinates(name, finalCountry);
    const remainingDays = Math.max(1, tripDurationDays - totalAllocatedDays);
    const initialDays = Math.min(1, remainingDays);

    const newDest: WorkspaceDestination = {
      id: generateCustomDestId(),
      name,
      countryId: finalCountryId,
      country: finalCountry,
      order: destinations.length,
      days: initialDays,
      accommodation: '',
      activities: '',
      transportation: '',
      latitude: coords ? coords[1] : undefined,
      longitude: coords ? coords[0] : undefined,
    };

    const updatedRoute = mergeCountryRoute(countryRoute, [finalCountryId]);
    const updated = orderDestinationsByCountryRoute(
      [...destinations, newDest],
      updatedRoute,
    ).map((destination, order) => ({ ...destination, order }));
    setCountryRoute(updatedRoute);
    setDestinations(updated);
    persistDestinations(updated, updatedRoute);
    setActiveDestinationId(newDest.id);
    setIsMobileAddDestOpen(false);
    setMobileDestName('');
  };

  // The configured route order is the single source of truth for countries.
  const availableCountries = useMemo(() => {
    return countryRoute;
  }, [countryRoute]);

  const toggleCountryCollapse = (countryId: CountryId) => {
    setCollapsedCountries((prev) => ({
      ...prev,
      [countryId]: !prev[countryId],
    }));
  };

  const handleAddCountry = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCountrySelection.length === 0) return;

    const updatedRoute = mergeCountryRoute(countryRoute, newCountrySelection);
    setCountryRoute(updatedRoute);
    if (tripId) saveTripExtras(tripId, { countryRoute: updatedRoute });
    setSelectedCountryForNew(newCountrySelection[0]);
    setNewCountrySelection([]);
    setIsAddCountryModalOpen(false);

    setCollapsedCountries((prev) => {
      const next = { ...prev };
      newCountrySelection.forEach((countryId) => {
        next[countryId] = false;
      });
      return next;
    });

    // Focus destination search bar
    setTimeout(() => {
      const el = document.getElementById('workspace-dest-input');
      if (el) el.focus();
    }, 100);
  };

  const handleRemoveCountry = (countryIdToRemove: CountryId, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const countryName = getCountryName(countryIdToRemove);
    const itemsInCountry = destinations.filter(
      (destination) => destination.countryId === countryIdToRemove,
    );
    if (e?.currentTarget instanceof HTMLElement) {
      countryRemoveTriggerRef.current = e.currentTarget;
    }

    setPendingCountryRemoval({
      countryId: countryIdToRemove,
      countryName,
      destinationCount: itemsInCountry.length,
    });
  };

  const executeCountryRemoval = (countryIdToRemove: CountryId) => {
    // 1. Remove destinations belonging to this country
    const updatedDests = destinations.filter(
      (destination) => destination.countryId !== countryIdToRemove,
    );
    const updatedRoute = removeCountryFromRoute(countryRoute, countryIdToRemove);
    setDestinations(updatedDests);
    setCountryRoute(updatedRoute);
    persistDestinations(updatedDests, updatedRoute);

    if (trip) {
      setTrip({
        ...trip,
        countries: updatedRoute.map((country) => country.name),
        countryRoute: updatedRoute,
      });
    }

    if (selectedCountryForNew === countryIdToRemove) {
      setSelectedCountryForNew(updatedRoute[0]?.countryId || '');
    }

    // 6. Clean up collapsed state
    setCollapsedCountries((prev) => {
      const next = { ...prev };
      delete next[countryIdToRemove];
      return next;
    });
  };

  const confirmCountryRemoval = () => {
    if (!pendingCountryRemoval) return;
    executeCountryRemoval(pendingCountryRemoval.countryId);
    setPendingCountryRemoval(null);
  };

  const handleSelectSuggestion = (place: DestinationPlace) => {
    const country = getCountryOption(place.country);
    if (!country) return;
    setNewDestInput(place.name);
    setSelectedCountryForNew(country.id);
    setCountryRoute((current) => mergeCountryRoute(current, [country.id]));
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setCollapsedCountries((prev) => ({ ...prev, [country.id]: false }));
  };

  const handleAddDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDestInput.trim()) return;

    setShowSuggestions(false);
    setHighlightedIndex(-1);

    const name = newDestInput.trim();
    const finalCountryId = getCountryId(selectedCountryForNew);
    const finalCountry = finalCountryId ? getCountryName(finalCountryId) : '';
    if (!finalCountryId || !finalCountry) {
      setIsAddCountryModalOpen(true);
      return;
    }

    const coords = getWorkspaceCoordinates(name, finalCountry);

    // Initial days allocation respects trip date picker remaining days
    const remainingDays = Math.max(1, tripDurationDays - totalAllocatedDays);
    const initialDays = Math.min(1, remainingDays);

    const newDest: WorkspaceDestination = {
      id: generateCustomDestId(),
      name,
      countryId: finalCountryId,
      country: finalCountry,
      order: destinations.length,
      days: initialDays,
      accommodation: '',
      activities: '',
      transportation: '',
      latitude: coords ? coords[1] : undefined,
      longitude: coords ? coords[0] : undefined,
    };

    const updatedRoute = mergeCountryRoute(countryRoute, [finalCountryId]);
    const updated = orderDestinationsByCountryRoute(
      [...destinations, newDest],
      updatedRoute,
    ).map((destination, order) => ({ ...destination, order }));
    setCountryRoute(updatedRoute);
    setDestinations(updated);
    persistDestinations(updated, updatedRoute);
    setActiveDestinationId(newDest.id);
    setNewDestInput('');
  };

  const handleUpdateDestination = (
    id: string,
    field: keyof WorkspaceDestination,
    value: string | number,
  ) => {
    const finalValue =
      field === 'days' ? (value === '' ? '' : Math.max(1, Number(value) || 1)) : value;
    const updated = destinations.map((destination) =>
      destination.id === id ? { ...destination, [field]: finalValue } : destination,
    );
    setDestinations(updated);
    persistDestinations(updated, countryRoute);
  };

  const handleRouteDestinationNameChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const destinationId = event.currentTarget.dataset.destinationId;
    if (!destinationId) return;
    handleUpdateDestination(destinationId, 'name', event.currentTarget.value);
  };

  const handleDeleteDestination = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = destinations.filter((d) => d.id !== id);
    setDestinations(updated);
    persistDestinations(updated, countryRoute);
    if (activeDestinationId === id)
      setActiveDestinationId(updated.length > 0 ? updated[0].id : null);
  };

  const moveDestination = (id: string, direction: 'up' | 'down') => {
    const idx = destinations.findIndex((d) => d.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= destinations.length) return;

    const next = [...destinations];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    const reordered = next.map((destination, order) => ({ ...destination, order }));
    setDestinations(reordered);
    persistDestinations(reordered, countryRoute);
  };

  const renderFieldSelector = (
    destId: string,
    field: 'accommodation' | 'activities' | 'transportation',
    currentValue: string | undefined,
    baseOptions: string[],
    placeholder: string,
  ) => {
    const isInputActive = customInputActive[`${destId}-${field}`];
    const extraOptions = userCustomOptions[field] || [];
    const allOptions = Array.from(new Set([...baseOptions, ...extraOptions]));
    const isCustomValue = Boolean(currentValue && !allOptions.includes(currentValue));

    if (isInputActive) {
      return (
        <div
          className="flex items-center gap-1 w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={currentValue || ''}
            onChange={(e) => handleUpdateDestination(destId, field, e.target.value)}
            onBlur={() => {
              if (currentValue && currentValue.trim()) {
                const val = currentValue.trim();
                setUserCustomOptions((prev) => ({
                  ...prev,
                  [field]: Array.from(new Set([...(prev[field] || []), val])),
                }));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (currentValue && currentValue.trim()) {
                  const val = currentValue.trim();
                  setUserCustomOptions((prev) => ({
                    ...prev,
                    [field]: Array.from(new Set([...(prev[field] || []), val])),
                  }));
                }
                setCustomInputActive((prev) => ({
                  ...prev,
                  [`${destId}-${field}`]: false,
                }));
              } else if (e.key === 'Escape') {
                setCustomInputActive((prev) => ({
                  ...prev,
                  [`${destId}-${field}`]: false,
                }));
              }
            }}
            placeholder={`Type custom ${field}...`}
            className="flex-1 min-w-0 px-2 py-1 text-xs text-slate-800 bg-white border border-amber-400 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all shadow-xs"
          />
          <button
            type="button"
            onClick={() => {
              if (currentValue && currentValue.trim()) {
                const val = currentValue.trim();
                setUserCustomOptions((prev) => ({
                  ...prev,
                  [field]: Array.from(new Set([...(prev[field] || []), val])),
                }));
              }
              setCustomInputActive((prev) => ({
                ...prev,
                [`${destId}-${field}`]: false,
              }));
            }}
            className="shrink-0 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded border border-slate-200 hover:border-slate-300 transition-colors"
            title="Switch back to dropdown list"
            aria-label="Switch back to dropdown list"
          >
            <ChevronDown size={13} />
          </button>
        </div>
      );
    }

    return (
      <div className="w-full min-w-0" onClick={(e) => e.stopPropagation()}>
        <select
          value={currentValue || ''}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '__CUSTOM__') {
              setCustomInputActive((prev) => ({
                ...prev,
                [`${destId}-${field}`]: true,
              }));
            } else {
              handleUpdateDestination(destId, field, val);
            }
          }}
          className="w-full min-w-0 h-8 px-2 py-1 text-xs text-[#2F1B0C] bg-white hover:bg-slate-50 border border-[rgba(72,42,19,0.14)] hover:border-slate-300 rounded-lg focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer truncate shadow-xs font-normal"
          title={currentValue || placeholder}
        >
          <option value="">{currentValue ? '-- Clear / None --' : placeholder}</option>
          {isCustomValue && <option value={currentValue}>{currentValue} (Custom)</option>}
          {allOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value="__CUSTOM__" className="text-amber-700 font-semibold">
            + Enter custom...
          </option>
        </select>
      </div>
    );
  };

  const globeMarkers = destinations
    .map((dest, index) => {
      const coords =
        dest.longitude != null && dest.latitude != null
          ? ([dest.longitude, dest.latitude] as [number, number])
          : getWorkspaceCoordinates(dest.name, dest.country);

      if (!coords) return null;

      return {
        id: dest.id,
        lng: coords[0],
        lat: coords[1],
        title: `${index + 1}. ${dest.name} (${dest.country || ''})`,
      };
    })
    .filter(
      (m): m is { id: string; lng: number; lat: number; title: string } => m !== null,
    );

  const orderedDestinations = useMemo(
    () => orderDestinationsByCountryRoute(destinations, countryRoute),
    [destinations, countryRoute],
  );

  // Group destinations strictly by the persisted country route order.
  const groupedByCountry = useMemo(() => {
    const groups: {
      countryId: CountryId;
      country: string;
      totalDays: number;
      items: WorkspaceDestination[];
    }[] = [];
    const countryMap = new Map<string, WorkspaceDestination[]>();

    availableCountries.forEach((country) => {
      countryMap.set(country.countryId, []);
    });

    orderedDestinations.forEach((destination) => {
      if (!countryMap.has(destination.countryId)) {
        countryMap.set(destination.countryId, []);
      }
      countryMap.get(destination.countryId)!.push(destination);
    });

    countryMap.forEach((items, countryId) => {
      const totalDays = items.reduce(
        (sum, item) => sum + (Number(item.days) || Number(item.nights) || 1),
        0,
      );
      groups.push({
        countryId,
        country: getCountryName(countryId),
        totalDays,
        items,
      });
    });

    return groups;
  }, [orderedDestinations, availableCountries]);

  const itineraryDateRanges = useMemo(() => {
    const destinationRanges = new Map<string, string>();
    const countryRanges = new Map<CountryId, string>();
    if (!trip?.startDate) return { destinationRanges, countryRanges };

    const routeStart = new Date(`${trip.startDate.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(routeStart.getTime())) return { destinationRanges, countryRanges };

    const cursor = new Date(routeStart);
    groupedByCountry.forEach((group) => {
      const countryStart = new Date(cursor);
      group.items.forEach((destination) => {
        const destinationStart = new Date(cursor);
        const nights = Math.max(
          1,
          Number(destination.days) || Number(destination.nights) || 1,
        );
        cursor.setUTCDate(cursor.getUTCDate() + nights);
        destinationRanges.set(
          destination.id,
          formatUserDateRange(destinationStart.toISOString(), cursor.toISOString()),
        );
      });

      if (group.items.length > 0) {
        countryRanges.set(
          group.countryId,
          formatUserDateRange(countryStart.toISOString(), cursor.toISOString()),
        );
      }
    });
    return { destinationRanges, countryRanges };
  }, [groupedByCountry, trip?.startDate]);

  // Day-by-day itinerary schedule breakdown
  const daySchedule = useMemo(() => {
    const schedule: {
      dayNumber: number;
      destination: WorkspaceDestination | null;
      dayOfDestination?: number;
    }[] = [];
    let currentDay = 1;

    orderedDestinations.forEach((dest) => {
      const destDays = Math.max(1, Number(dest.days) || Number(dest.nights) || 1);
      for (let d = 1; d <= destDays && currentDay <= tripDurationDays; d++) {
        schedule.push({
          dayNumber: currentDay,
          destination: dest,
          dayOfDestination: d,
        });
        currentDay++;
      }
    });

    // Fill in remaining unallocated days up to tripDurationDays
    while (currentDay <= tripDurationDays) {
      schedule.push({
        dayNumber: currentDay,
        destination: null,
      });
      currentDay++;
    }

    return schedule;
  }, [orderedDestinations, tripDurationDays]);

  const renderCountrySearchRow = (countryId: CountryId) => {
    const countryName = getCountryName(countryId);
    const activeCountryId =
      getCountryId(selectedCountryForNew) || groupedByCountry[0]?.countryId;
    const isActiveCountry = activeCountryId === countryId;

    if (!isActiveCountry) {
      return (
        <div className="workspace-add-destination-grid-row">
          <button
            type="button"
            className="workspace-add-destination-trigger"
            onClick={() => {
              setSelectedCountryForNew(countryId);
              setHighlightedIndex(-1);
              window.setTimeout(() => {
                document.getElementById('workspace-dest-input')?.focus();
              }, 0);
            }}
          >
            <Plus size={14} aria-hidden="true" />
            <span>Add destination in {countryName}</span>
          </button>
        </div>
      );
    }

    return (
      <form
        onSubmit={handleAddDestination}
        className="workspace-add-destination-row workspace-country-search-row"
      >
        <div
          ref={searchContainerRef}
          className="workspace-add-destination-search relative flex flex-1 min-w-0 items-center gap-2"
        >
          <img
            src={magnifierIcon}
            alt=""
            aria-hidden="true"
            className="w-3.5 h-3.5 opacity-60 shrink-0"
          />
          <input
            id="workspace-dest-input"
            type="text"
            value={newDestInput}
            onChange={(event) => {
              setNewDestInput(event.target.value);
              setShowSuggestions(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => {
              setSelectedCountryForNew(countryId);
              if (newDestInput.trim()) setShowSuggestions(true);
            }}
            onKeyDown={(event) => {
              if (!showSuggestions || inRouteSuggestions.length === 0) return;
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setHighlightedIndex((previous) =>
                  previous < inRouteSuggestions.length - 1 ? previous + 1 : 0,
                );
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setHighlightedIndex((previous) =>
                  previous > 0 ? previous - 1 : inRouteSuggestions.length - 1,
                );
              } else if (event.key === 'Enter') {
                if (highlightedIndex >= 0 && inRouteSuggestions[highlightedIndex]) {
                  event.preventDefault();
                  handleSelectSuggestion(inRouteSuggestions[highlightedIndex]);
                }
              } else if (event.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            placeholder={`Search city or destination in ${countryName}`}
            className="workspace-add-input flex-1 min-w-0 bg-transparent text-xs text-[#2F1B0C] outline-none placeholder:text-[#74675D]/60"
            autoComplete="off"
          />

          {showSuggestions && newDestInput.trim() && (
            <AnchoredPopover
              anchorRef={searchContainerRef}
              onClose={() => setShowSuggestions(false)}
              matchAnchorWidth
              gap={6}
              estimatedHeight={270}
              className="workspace-dest-dropdown"
              role="listbox"
            >
              {inRouteSuggestions.length > 0 ? (
                inRouteSuggestions.map((place, index) => (
                  <div
                    key={`${place.name}-${place.country}`}
                    role="option"
                    tabIndex={0}
                    aria-selected={index === highlightedIndex}
                    className={`workspace-dest-option flex items-center justify-between p-2 rounded-lg cursor-pointer ${index === highlightedIndex ? 'highlighted' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelectSuggestion(place);
                    }}
                    onClick={() => handleSelectSuggestion(place)}
                  >
                    <div className="workspace-dest-option-main flex items-center gap-2">
                      <MapPin size={13} aria-hidden="true" />
                      <span className="workspace-dest-option-name">{place.name}</span>
                      <span className="workspace-dest-option-country">
                        {place.country}
                      </span>
                    </div>
                    <span className="workspace-dest-option-action">Add +</span>
                  </div>
                ))
              ) : (
                <div className="workspace-dest-empty-state">
                  <div className="workspace-dest-empty-title">
                    No places found in {countryName}.
                  </div>
                  {otherRouteSuggestions.length > 0 && (
                    <div>Choose another country in your route to search there.</div>
                  )}
                  {outOfRouteSuggestions.length > 0 && (
                    <div>Add another country to search destinations there.</div>
                  )}
                </div>
              )}
            </AnchoredPopover>
          )}
        </div>

        <div className="workspace-add-actions">
          <span className="workspace-add-availability">
            {tripDurationDays - totalAllocatedDays > 0
              ? `${tripDurationDays - totalAllocatedDays} of ${tripDurationDays} Days Available`
              : totalAllocatedDays === tripDurationDays
                ? `All ${tripDurationDays} Days Allocated`
                : `${totalAllocatedDays} of ${tripDurationDays} Days Allocated`}
          </span>
          <button
            type="submit"
            disabled={totalAllocatedDays >= tripDurationDays && destinations.length > 0}
            className="workspace-add-btn"
            title="Add Destination"
          >
            <Plus size={14} aria-hidden="true" />
            Add
          </button>
        </div>
      </form>
    );
  };

  if (loading) {
    return (
      <div className="workspace-page">
        <div className="workspace-main-card">Loading itinerary workspace...</div>
      </div>
    );
  }

  if (!trip || notFound) {
    return (
      <div
        className="workspace-page"
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          display: 'flex',
          minHeight: '100vh',
        }}
      >
        <div className="dashboard-empty-state" style={{ margin: 'auto' }}>
          <h3 className="dashboard-empty-title">Trip not found</h3>
          <p className="dashboard-empty-text">
            We couldn't find the trip you're looking for. It might have been deleted or
            belongs to another user.
          </p>
          <div className="dashboard-empty-actions">
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="btn-create-trip dashboard-btn-create"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <header className="workspace-header-card animate-slide-up">
        <div>
          <h1 className="workspace-trip-title">{trip.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-semibold text-stone-600">
              {tripDurationDays} Total {tripDurationDays === 1 ? 'Day' : 'Days'}
            </span>
            <span className="text-xs text-stone-300">•</span>
            <span
              className={`text-xs font-semibold ${
                totalAllocatedDays === tripDurationDays
                  ? 'text-emerald-700'
                  : totalAllocatedDays < tripDurationDays
                    ? 'text-amber-800'
                    : 'text-rose-700'
              }`}
            >
              {totalAllocatedDays} of {tripDurationDays} Days Planned
              {tripDurationDays - totalAllocatedDays > 0
                ? ` (${tripDurationDays - totalAllocatedDays} remaining)`
                : ''}
            </span>
            {availableCountries.length > 0 && (
              <>
                <span className="text-xs text-stone-300">•</span>
                <span className="text-xs text-slate-500">
                  {availableCountries
                    .map((country) => country.name)
                    .filter(Boolean)
                    .join(' • ')}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="workspace-header-actions">
          <div className="workspace-pill-date">
            {formatUserDateRange(trip.startDate, trip.endDate)}
          </div>
        </div>
      </header>

      <div className="workspace-main-card hidden md:flex">
        <div className="workspace-itinerary-zone animate-slide-up delay-150">
          <div className="workspace-tabs-container flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <button
                className={`pill-tab ${activeTab === 'route' ? 'pill-tab--active' : ''}`}
                onClick={() => handleTabChange('route')}
              >
                <img src={routeIcon} alt="" className="workspace-tab-icon" />
                Route Planner
              </button>
              <button
                className={`pill-tab ${activeTab === 'day' ? 'pill-tab--active' : ''}`}
                onClick={() => handleTabChange('day')}
              >
                <img src={dayByDayIcon} alt="" className="workspace-tab-icon" />
                Day by Day
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsAddCountryModalOpen(true)}
              className="pill-tab"
              style={{
                backgroundColor: '#FFF7DB',
                border: '1px solid rgba(72, 42, 19, 0.14)',
                color: '#8C4D00',
                gap: '6px',
                marginLeft: 'auto',
                fontWeight: 600,
                fontSize: '11px',
              }}
              title="Add another country to this trip"
            >
              <Plus size={14} />
              <span>Add Country</span>
            </button>
          </div>

          {activeTab === 'route' ? (
            <div className="workspace-itinerary-table flex-1 min-h-0 overflow-y-auto pr-1">
              {/* Grouped by Country Hierarchy */}
              <div className="workspace-destination-rows">
                {groupedByCountry.length === 0 ? (
                  <div className="workspace-route-empty-state">
                    <Globe
                      size={24}
                      aria-hidden="true"
                      className="workspace-route-empty-icon"
                    />
                    <div className="workspace-route-empty-copy">
                      <h4 className="workspace-route-empty-title">
                        No countries in this route
                      </h4>
                      <p className="workspace-route-empty-description">
                        Add a country to start organizing your destinations,
                        accommodations, and activities.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddCountryModalOpen(true)}
                      className="workspace-route-empty-cta"
                    >
                      <Plus size={14} aria-hidden="true" /> <span>Add Country</span>
                    </button>
                  </div>
                ) : (
                  groupedByCountry.map((group) => {
                    const isCollapsed = collapsedCountries[group.countryId];
                    return (
                      <div
                        key={group.countryId}
                        className={`workspace-country-group ${isCollapsed ? 'is-collapsed' : ''}`}
                      >
                        {/* Top-Level Country Row */}
                        <div className="workspace-country-header">
                          <div
                            className="workspace-country-heading cursor-pointer select-none"
                            onClick={() => {
                              setSelectedCountryForNew(group.countryId);
                              setHighlightedIndex(-1);
                              toggleCountryCollapse(group.countryId);
                            }}
                          >
                            {isCollapsed ? (
                              <ChevronRight size={16} className="text-[#8C4D00]" />
                            ) : (
                              <ChevronDown size={16} className="text-[#8C4D00]" />
                            )}
                            <span className="workspace-country-name">
                              {group.country}
                            </span>
                            <span className="workspace-country-date-range">
                              {itineraryDateRanges.countryRanges.get(group.countryId) ||
                                'Dates flexible'}
                            </span>
                            <span className="workspace-country-days">
                              {group.totalDays} {group.totalDays === 1 ? 'day' : 'days'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleRemoveCountry(group.countryId, e)}
                            className="workspace-country-remove"
                            title={`Remove ${group.country} from trip`}
                            aria-label={`Remove ${group.country}`}
                          >
                            <X size={12} />
                            <span>Remove Country</span>
                          </button>
                        </div>

                        {/* Nested Cities / Destinations Rows */}
                        {!isCollapsed && (
                          <div className="workspace-country-content">
                            <div className="workspace-table-header-row workspace-route-grid">
                              <div className="workspace-table-heading workspace-heading-destination">
                                <MapPin size={13} aria-hidden="true" />
                                <span>Destination</span>
                              </div>
                              <div className="workspace-table-heading workspace-heading-nights">
                                <Moon size={13} aria-hidden="true" />
                                <span>Nights</span>
                              </div>
                              <div className="workspace-table-heading workspace-heading-accommodation">
                                <BedDouble size={13} aria-hidden="true" />
                                <span>Accommodation</span>
                              </div>
                              <div className="workspace-table-heading workspace-heading-activities">
                                <Sparkles size={13} aria-hidden="true" />
                                <span>Activities</span>
                              </div>
                              <div className="workspace-table-heading workspace-heading-transport">
                                <BusFront size={13} aria-hidden="true" />
                                <span>Transport</span>
                              </div>
                            </div>
                            {group.items.length === 0 ? (
                              <div className="workspace-empty-destination-row workspace-route-grid">
                                <div className="workspace-empty-destination-copy">
                                  <MapPin size={15} aria-hidden="true" />
                                  <div>
                                    <strong>
                                      No destinations in {group.country} yet
                                    </strong>
                                    <span>
                                      Use the search bar below to add a city, island, or
                                      place to {group.country}.
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              group.items.map((dest) => {
                                const globalIndex = destinations.findIndex(
                                  (d) => d.id === dest.id,
                                );
                                const otherDays = destinations.reduce(
                                  (sum, d) =>
                                    d.id === dest.id ? sum : sum + (Number(d.days) || 1),
                                  0,
                                );
                                const maxDaysForThisDest = Math.max(
                                  1,
                                  tripDurationDays - otherDays,
                                );

                                return (
                                  <div
                                    key={dest.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setActiveDestinationId(dest.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setActiveDestinationId(dest.id);
                                      }
                                    }}
                                    className={`workspace-destination-row workspace-route-grid relative ${activeDestinationId === dest.id ? 'active' : ''}`}
                                  >
                                    <div className="workspace-route-destination-cell">
                                      <span className="workspace-route-order">
                                        {globalIndex + 1}
                                      </span>
                                      <div className="workspace-route-destination-copy">
                                        <input
                                          type="text"
                                          value={dest.name || ''}
                                          data-destination-id={dest.id}
                                          onChange={handleRouteDestinationNameChange}
                                          placeholder="City name"
                                          className="workspace-route-destination-name"
                                          title={dest.name}
                                        />
                                        <span className="workspace-route-date-range">
                                          {itineraryDateRanges.destinationRanges.get(
                                            dest.id,
                                          ) || 'Dates flexible'}
                                        </span>
                                      </div>
                                      <div className="workspace-route-row-actions">
                                        <button
                                          type="button"
                                          disabled={globalIndex === 0}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            moveDestination(dest.id, 'up');
                                          }}
                                          className="workspace-route-row-action"
                                          title="Move Up"
                                          aria-label={`Move ${dest.name} up`}
                                        >
                                          <ArrowUp size={11} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) =>
                                            handleDeleteDestination(dest.id, e)
                                          }
                                          className="workspace-route-row-action workspace-route-delete"
                                          title="Remove Destination"
                                          aria-label={`Remove ${dest.name}`}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={
                                            globalIndex === destinations.length - 1
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            moveDestination(dest.id, 'down');
                                          }}
                                          className="workspace-route-row-action"
                                          title="Move Down"
                                          aria-label={`Move ${dest.name} down`}
                                        >
                                          <ArrowDown size={11} />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="workspace-route-nights-cell">
                                      <button
                                        type="button"
                                        className="workspace-route-nights-step"
                                        disabled={(Number(dest.days) || 1) <= 1}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateDestination(
                                            dest.id,
                                            'days',
                                            Math.max(1, (Number(dest.days) || 1) - 1),
                                          );
                                        }}
                                        aria-label={`Remove a night from ${dest.name}`}
                                      >
                                        <Minus size={13} />
                                      </button>
                                      <input
                                        type="number"
                                        min="1"
                                        max={maxDaysForThisDest}
                                        value={dest.days ?? ''}
                                        onChange={(e) =>
                                          handleUpdateDestination(
                                            dest.id,
                                            'days',
                                            e.target.value === ''
                                              ? ''
                                              : Number.parseInt(e.target.value, 10),
                                          )
                                        }
                                        onBlur={(e) => {
                                          const parsed = Number.parseInt(
                                            e.currentTarget.value,
                                            10,
                                          );
                                          const validated = Number.isFinite(parsed)
                                            ? Math.max(
                                                1,
                                                Math.min(parsed, maxDaysForThisDest),
                                              )
                                            : 1;
                                          handleUpdateDestination(
                                            dest.id,
                                            'days',
                                            validated,
                                          );
                                        }}
                                        className="workspace-route-nights-input"
                                        title={`Nights (Max ${maxDaysForThisDest} based on trip dates)`}
                                      />
                                      <button
                                        type="button"
                                        className="workspace-route-nights-step"
                                        disabled={
                                          (Number(dest.days) || 1) >= maxDaysForThisDest
                                        }
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateDestination(
                                            dest.id,
                                            'days',
                                            Math.min(
                                              maxDaysForThisDest,
                                              (Number(dest.days) || 1) + 1,
                                            ),
                                          );
                                        }}
                                        aria-label={`Add a night to ${dest.name}`}
                                      >
                                        <Plus size={13} />
                                      </button>
                                    </div>

                                    {/* Accommodation Dropdown with Custom Add Button */}
                                    <div className="workspace-col-accommodation">
                                      {renderFieldSelector(
                                        dest.id,
                                        'accommodation',
                                        dest.accommodation,
                                        ACCOMMODATION_OPTIONS,
                                        'Select accom...',
                                      )}
                                    </div>

                                    {/* Activities Dropdown with Custom Add Button */}
                                    <div className="workspace-col-activities">
                                      {renderFieldSelector(
                                        dest.id,
                                        'activities',
                                        dest.activities,
                                        ACTIVITIES_OPTIONS,
                                        'Select activity...',
                                      )}
                                    </div>

                                    <div className="workspace-col-transportation">
                                      {renderFieldSelector(
                                        dest.id,
                                        'transportation',
                                        dest.transportation,
                                        TRANSPORTATION_OPTIONS,
                                        'Select trans...',
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                            {renderCountrySearchRow(group.countryId)}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Day by Day View */
            <div className="workspace-day-schedule flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden p-1">
              <div className="workspace-day-summary flex items-center justify-between px-1 pt-1.5 pb-2 mb-1 shrink-0 border-b border-[rgba(72,42,19,0.08)]">
                <span className="text-[11px] font-bold tracking-wider text-[#5A381E] uppercase">
                  {(
                    availableCountries
                      .map((c) => c.name)
                      .filter(Boolean)
                      .join(' + ') || 'TRIP'
                  ).toUpperCase()}{' '}
                  · DAYS 1–{tripDurationDays}
                </span>
                <span className="text-[10.5px] font-semibold text-[#E9724C] tracking-tight">
                  {daySchedule.filter((d) => d.destination !== null).length} planned ·{' '}
                  {daySchedule.filter((d) => d.destination === null).length} unplanned
                </span>
              </div>

              <div
                ref={dayScheduleListRef}
                className="workspace-day-schedule-list flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto pr-4"
              >
                {daySchedule.map((item) => {
                  if (item.destination) {
                    return (
                      <div
                        key={`day-${item.dayNumber}`}
                        className="workspace-planned-day-card flex items-center min-h-[76px] bg-white rounded-xl border border-[rgba(72,42,19,0.14)] shadow-xs overflow-hidden shrink-0 transition-shadow hover:shadow-sm"
                      >
                        {/* Day Badge matching Figma #FFF5C2 and #994D00 */}
                        <div className="workspace-day-number-column w-[72px] self-stretch bg-[#FFF5C2] flex flex-col items-center justify-center shrink-0 border-r border-[rgba(72,42,19,0.06)] py-2 select-none">
                          <span className="text-[8.5px] font-bold text-[#994D00] uppercase tracking-wider">
                            DAY
                          </span>
                          <span className="text-xl font-bold text-[#994D00] leading-none mt-1">
                            {item.dayNumber}
                          </span>
                        </div>

                        {/* Content grid: Desktop 5-part layout (Destination 1.2fr | Stay 1fr | Activity 1.15fr | Transit 1fr) with 24px column gap */}
                        <div className="workspace-day-planned-content flex-1 min-w-0 px-4 py-3 flex flex-col lg:grid lg:grid-cols-[1.2fr_1fr_1.15fr_1fr] lg:gap-x-6 lg:items-center gap-y-2.5">
                          {/* Destination info */}
                          <div className="min-w-0 pr-1 flex flex-col justify-center">
                            <div
                              className="font-bold text-[13px] text-[#2F1B0C] leading-snug truncate"
                              title={item.destination.name}
                            >
                              {item.destination.name}
                            </div>
                            <div className="text-[10px] text-[#74675D] font-medium leading-normal mt-0.5 truncate">
                              {item.destination.country ||
                                getCountryName(item.destination.countryId)}{' '}
                              · Day {item.dayOfDestination} of{' '}
                              {item.destination.days || 1}
                            </div>
                          </div>

                          {/* Metadata: Stay, Activity, Transit (3-col on tablet, stacked on mobile, contents on desktop) */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 lg:contents gap-2 sm:gap-4 lg:gap-0">
                            {/* Stay */}
                            <div className="min-w-0 flex flex-col justify-center">
                              <span className="text-[8.5px] font-bold text-[#8C7E74] uppercase tracking-wider mb-1">
                                Stay
                              </span>
                              <span
                                className="text-[11px] font-semibold text-[#2F1B0C] leading-snug line-clamp-2 break-words"
                                title={item.destination.accommodation || '—'}
                              >
                                {item.destination.accommodation || '—'}
                              </span>
                            </div>

                            {/* Activity */}
                            <div className="min-w-0 flex flex-col justify-center">
                              <span className="text-[8.5px] font-bold text-[#8C7E74] uppercase tracking-wider mb-1">
                                Activity
                              </span>
                              <span
                                className="text-[11px] font-semibold text-[#2F1B0C] leading-snug line-clamp-2 break-words"
                                title={item.destination.activities || '—'}
                              >
                                {item.destination.activities || '—'}
                              </span>
                            </div>

                            {/* Transit */}
                            <div className="min-w-0 flex flex-col justify-center">
                              <span className="text-[8.5px] font-bold text-[#8C7E74] uppercase tracking-wider mb-1">
                                Transit
                              </span>
                              <span
                                className="text-[11px] font-semibold text-[#2F1B0C] leading-snug line-clamp-2 break-words"
                                title={item.destination.transportation || '—'}
                              >
                                {item.destination.transportation || '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  /* Unplanned / Free Day */
                  return (
                    <div
                      key={`day-${item.dayNumber}`}
                      className="workspace-unplanned-day-card flex items-stretch min-h-[58px] bg-[#FEFCF9] rounded-xl border border-[rgba(72,42,19,0.14)] shadow-xs overflow-hidden shrink-0"
                    >
                      <div className="workspace-day-number-column w-[72px] self-stretch bg-[#FFF5C2] flex flex-col items-center justify-center shrink-0 border-r border-[rgba(72,42,19,0.06)] py-2 select-none">
                        <span className="text-[8.5px] font-bold text-[#994D00] uppercase tracking-wider">
                          DAY
                        </span>
                        <span className="text-xl font-bold text-[#994D00] leading-none mt-1">
                          {item.dayNumber}
                        </span>
                      </div>
                      <span className="workspace-unplanned-message text-[10px] text-[#8091AB] font-normal leading-normal">
                        Unplanned / Free Day — add a destination to schedule this day.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          handleTabChange('route');
                          setTimeout(() => {
                            const el = document.getElementById('workspace-dest-input');
                            if (el) el.focus();
                          }, 100);
                        }}
                        className="workspace-unplanned-add group inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-blue hover:text-[#1A4562] transition-colors shrink-0 whitespace-nowrap cursor-pointer py-1 focus:outline-none focus-visible:underline"
                      >
                        <Plus
                          size={13}
                          strokeWidth={2.5}
                          className="shrink-0 text-brand-blue group-hover:text-[#1A4562] transition-colors"
                        />
                        <span className="group-hover:underline">Add destination</span>
                      </button>
                    </div>
                  );
                })}

                {daySchedule.length > 8 && (
                  <div className="text-center text-[9px] text-[#74675D] py-2">
                    Scroll to continue to Days 9–{daySchedule.length}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="workspace-vertical-divider"></div>

        <div className="workspace-map-zone animate-slide-up delay-300">
          <GlobeMap
            markers={globeMarkers}
            activeMarkerId={activeDestinationId}
            onMarkerClick={(id) => setActiveDestinationId(id)}
            showRouteLines={activeTab === 'route'}
          />
        </div>
      </div>

      {/* Approved Mobile Workspace (Figma 829:172 and 829:226) */}
      <div className="workspace-mobile-view md:hidden flex flex-col gap-3 px-[18px] py-4 pb-20 bg-[#F9F4EE]">
        {/* Route / Day Mode Selector Row (Figma: y: 88, h: 32/38 pills) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabChange('route')}
              className={`w-[108px] h-[32px] rounded-[16px] font-['Poppins'] font-semibold text-[10px] transition-all flex items-center justify-center ${
                activeTab === 'route'
                  ? 'mobile-active-pill-btn'
                  : 'bg-white border border-[rgba(71,43,20,0.14)] text-[#2F1B0C]'
              }`}
            >
              Route Planner
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('day')}
              className={`w-[102px] h-[32px] rounded-[16px] font-['Poppins'] font-semibold text-[10px] transition-all flex items-center justify-center ${
                activeTab === 'day'
                  ? 'mobile-active-pill-btn'
                  : 'bg-white border border-[rgba(71,43,20,0.14)] text-[#2F1B0C]'
              }`}
            >
              Day by Day
            </button>
          </div>

          {activeTab === 'route' ? (
            <button
              type="button"
              onClick={() => setIsAddCountryModalOpen(true)}
              className="w-[122px] h-[38px] rounded-[19px] bg-white border border-[rgba(71,43,20,0.14)] font-['Poppins'] font-semibold text-[10px] text-[#2F1B0C] flex items-center justify-center gap-1 shrink-0 hover:bg-stone-50 transition-colors"
            >
              + Add Country
            </button>
          ) : (
            <span className="font-['Poppins'] font-semibold text-[10px] text-[#73665C] truncate text-right">
              {groupedByCountry[0]?.country || 'Spain'} · Days 1–{tripDurationDays}
            </span>
          )}
        </div>

        {/* Mode Content */}
        {activeTab === 'route' ? (
          /* Route Planner Mobile (Figma 829:172) */
          <div className="flex flex-col gap-3">
            {groupedByCountry.map((countryGroup) => (
              <div
                key={countryGroup.countryId}
                className="w-full bg-white rounded-[16px] p-[16px] border border-[rgba(71,43,20,0.14)] shadow-xs flex flex-col gap-3"
              >
                {/* Country Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-['Poppins'] font-bold text-[16px] text-[#2F1B0C]">
                      {countryGroup.country}
                    </h3>
                    {availableCountries.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveCountry(countryGroup.countryId, e)}
                        className="text-stone-400 hover:text-rose-600 p-1"
                        title={`Remove ${countryGroup.country}`}
                        aria-label={`Remove ${countryGroup.country}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <span className="font-['Poppins'] font-semibold text-[10px] text-[#E9724C]">
                    Days 1–{countryGroup.totalDays || tripDurationDays}
                  </span>
                </div>

                {/* Destination Cards */}
                {countryGroup.items.map((dest, idx) => (
                  <div
                    key={dest.id}
                    className="flex flex-col gap-2 pt-2 border-t border-stone-100 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-['Poppins'] font-semibold text-[13px] text-[#2F1B0C]">
                        {dest.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-['Poppins'] font-semibold text-[10px] text-[#73665C]">
                          Day {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDestination(dest.id, e)}
                          className="text-stone-400 hover:text-rose-600 p-1"
                          title={`Delete ${dest.name}`}
                          aria-label={`Delete ${dest.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Stay Field */}
                    <div className="flex flex-col">
                      <label
                        htmlFor={`mobile-stay-${dest.id}`}
                        className="font-['Poppins'] font-semibold text-[9px] text-[#73665C] mb-1"
                      >
                        Stay
                      </label>
                      <select
                        id={`mobile-stay-${dest.id}`}
                        value={dest.accommodation || ''}
                        onChange={(e) =>
                          handleUpdateDestination(
                            dest.id,
                            'accommodation',
                            e.target.value,
                          )
                        }
                        className="w-full h-[34px] bg-[#FCF9F6] border border-[rgba(71,43,20,0.08)] rounded-[9px] px-3 font-['Poppins'] font-normal text-[10px] text-[#2F1B0C] appearance-none focus:outline-none focus:border-stone-400"
                      >
                        <option value="">Select accommodation</option>
                        {ACCOMMODATION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        {dest.accommodation &&
                          !ACCOMMODATION_OPTIONS.includes(dest.accommodation) && (
                            <option value={dest.accommodation}>
                              {dest.accommodation}
                            </option>
                          )}
                      </select>
                    </div>

                    {/* Activity Field */}
                    <div className="flex flex-col">
                      <label
                        htmlFor={`mobile-act-${dest.id}`}
                        className="font-['Poppins'] font-semibold text-[9px] text-[#73665C] mb-1"
                      >
                        Activity
                      </label>
                      <select
                        id={`mobile-act-${dest.id}`}
                        value={dest.activities || ''}
                        onChange={(e) =>
                          handleUpdateDestination(dest.id, 'activities', e.target.value)
                        }
                        className="w-full h-[34px] bg-[#FCF9F6] border border-[rgba(71,43,20,0.08)] rounded-[9px] px-3 font-['Poppins'] font-normal text-[10px] text-[#2F1B0C] appearance-none focus:outline-none focus:border-stone-400"
                      >
                        <option value="">Select activity</option>
                        {ACTIVITIES_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        {dest.activities &&
                          !ACTIVITIES_OPTIONS.includes(dest.activities) && (
                            <option value={dest.activities}>{dest.activities}</option>
                          )}
                      </select>
                    </div>

                    {/* Transit Field */}
                    <div className="flex flex-col">
                      <label
                        htmlFor={`mobile-transit-${dest.id}`}
                        className="font-['Poppins'] font-semibold text-[9px] text-[#73665C] mb-1"
                      >
                        Transit
                      </label>
                      <select
                        id={`mobile-transit-${dest.id}`}
                        value={dest.transportation || ''}
                        onChange={(e) =>
                          handleUpdateDestination(
                            dest.id,
                            'transportation',
                            e.target.value,
                          )
                        }
                        className="w-full h-[34px] bg-[#FCF9F6] border border-[rgba(71,43,20,0.08)] rounded-[9px] px-3 font-['Poppins'] font-normal text-[10px] text-[#2F1B0C] appearance-none focus:outline-none focus:border-stone-400"
                      >
                        <option value="">Select transit</option>
                        {TRANSPORTATION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        {dest.transportation &&
                          !TRANSPORTATION_OPTIONS.includes(dest.transportation) && (
                            <option value={dest.transportation}>
                              {dest.transportation}
                            </option>
                          )}
                      </select>
                    </div>
                  </div>
                ))}

                {/* + Add Destination Button (Figma: 38px height, 19px radius) */}
                <button
                  type="button"
                  onClick={() => handleOpenAddDestForCountry(countryGroup.countryId)}
                  className="w-full h-[38px] rounded-[19px] bg-white border border-[rgba(71,43,20,0.14)] font-['Poppins'] font-semibold text-[10px] text-[#2F1B0C] mt-1 shadow-xs hover:bg-stone-50 transition-colors text-center"
                >
                  + Add Destination
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Day by Day Mobile (Figma 829:226) */
          <div className="flex flex-col gap-3">
            {daySchedule.map((entry) =>
              entry.destination ? (
                /* Planned Day Card (Figma: 176px min-height, 44px badge) */
                <div
                  key={entry.dayNumber}
                  className="w-full bg-white rounded-[16px] p-[16px] border border-[rgba(71,43,20,0.14)] shadow-xs flex gap-[14px] items-start"
                >
                  {/* Badge */}
                  <div className="w-[44px] h-[44px] rounded-[12px] bg-[#FFC857] flex items-center justify-center font-['Poppins'] font-bold text-[14px] text-[#2F1B0C] shrink-0">
                    {entry.dayNumber}
                  </div>

                  {/* Details */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-['Poppins'] font-bold text-[14px] text-[#2F1B0C] truncate">
                        {entry.destination.name}
                      </span>
                      <span className="font-['Poppins'] font-normal text-[9px] text-[#73665C] shrink-0">
                        {getDayDateString(entry.dayNumber)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="flex items-baseline">
                        <span className="w-[60px] font-['Poppins'] font-semibold text-[9px] text-[#73665C]">
                          Stay
                        </span>
                        <span className="font-['Poppins'] font-normal text-[10px] text-[#2F1B0C] truncate flex-1">
                          {entry.destination.accommodation || '—'}
                        </span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-[60px] font-['Poppins'] font-semibold text-[9px] text-[#73665C]">
                          Activity
                        </span>
                        <span className="font-['Poppins'] font-normal text-[10px] text-[#2F1B0C] truncate flex-1">
                          {entry.destination.activities || '—'}
                        </span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-[60px] font-['Poppins'] font-semibold text-[9px] text-[#73665C]">
                          Transit
                        </span>
                        <span className="font-['Poppins'] font-normal text-[10px] text-[#2F1B0C] truncate flex-1">
                          {entry.destination.transportation || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Free Day Card (Figma: 94px height, 44px badge) */
                <div
                  key={entry.dayNumber}
                  className="w-full bg-white rounded-[16px] p-[16px] border border-[rgba(71,43,20,0.14)] shadow-xs flex gap-[14px] items-center"
                >
                  <div className="w-[44px] h-[44px] rounded-[12px] bg-[#FCF9F6] border border-[rgba(71,43,20,0.08)] flex items-center justify-center font-['Poppins'] font-bold text-[14px] text-[#2F1B0C] shrink-0">
                    {entry.dayNumber}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <span className="font-['Poppins'] font-semibold text-[12px] text-[#2F1B0C]">
                      Free day
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const countryId = availableCountries[0]?.countryId;
                        if (countryId) handleOpenAddDestForCountry(countryId);
                        else setIsAddCountryModalOpen(true);
                      }}
                      className="h-[34px] px-3.5 rounded-[17px] bg-white border border-[rgba(71,43,20,0.14)] font-['Poppins'] font-semibold text-[10px] text-[#2F1B0C] flex items-center gap-1.5 w-fit hover:bg-stone-50 transition-colors"
                    >
                      {availableCountries.length > 0
                        ? '+ Add destination'
                        : '+ Add Country'}
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        {/* Mobile Map Section (Figma 829:172 and 829:226: 220px map shell) */}
        <div className="flex flex-col gap-1.5 mt-1">
          <h3 className="font-['Poppins'] font-bold text-[14px] text-[#2F1B0C]">Map</h3>
          <div className="w-full h-[220px] rounded-[16px] overflow-hidden border border-[rgba(71,43,20,0.14)] shadow-xs relative bg-[#E0E8E5]">
            <GlobeMap
              markers={globeMarkers}
              activeMarkerId={activeDestinationId}
              onMarkerClick={(id) => setActiveDestinationId(id)}
              showRouteLines={activeTab === 'route'}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>

      {/* Mobile Add Destination Modal */}
      {isMobileAddDestOpen && (
        <div className="staff-modal-backdrop" style={{ zIndex: 100 }}>
          <button
            type="button"
            className="staff-modal-backdrop-dismiss"
            aria-label="Close modal overlay"
            onClick={() => setIsMobileAddDestOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-add-dest-title"
            className="staff-modal-card"
            style={{ maxWidth: '400px' }}
          >
            <div className="flex justify-between items-center mb-3">
              <h2 id="mobile-add-dest-title" className="staff-modal-title">
                Add Destination
              </h2>
              <button
                type="button"
                onClick={() => setIsMobileAddDestOpen(false)}
                className="text-stone-500 hover:text-stone-800 p-1"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleMobileAddDestination} className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor="mobile-dest-country-select"
                  className="block text-xs font-semibold text-[#401C02] mb-1"
                >
                  Country
                </label>
                <select
                  id="mobile-dest-country-select"
                  value={mobileAddDestCountryId}
                  onChange={(e) => setMobileAddDestCountryId(e.target.value as CountryId)}
                  className="w-full border border-stone-300 rounded-lg p-2 text-xs font-medium text-[#2F1B0C] bg-white"
                >
                  {availableCountries.map((c) => (
                    <option key={c.countryId} value={c.countryId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="mobile-dest-name-input"
                  className="block text-xs font-semibold text-[#401C02] mb-1"
                >
                  Destination Name
                </label>
                <input
                  id="mobile-dest-name-input"
                  type="text"
                  value={mobileDestName}
                  onChange={(e) => setMobileDestName(e.target.value)}
                  placeholder="e.g. Barcelona, Sagrada Família"
                  className="w-full border border-stone-300 rounded-lg p-2 text-xs text-[#2F1B0C] font-medium focus:outline-none focus:border-stone-500"
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsMobileAddDestOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-[#2F1B0C] bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!mobileDestName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[#E9724C] text-xs font-semibold text-white disabled:opacity-50"
                >
                  Add Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Country Modal */}
      {isAddCountryModalOpen && (
        <div className="staff-modal-backdrop" style={{ zIndex: 100 }}>
          <button
            type="button"
            className="staff-modal-backdrop-dismiss"
            aria-label="Close modal overlay"
            onClick={() => setIsAddCountryModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-country-modal-title"
            className="staff-modal-card"
            style={{ maxWidth: '420px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 id="add-country-modal-title" className="staff-modal-title">
                Add Country
              </h2>
              <button
                type="button"
                onClick={() => setIsAddCountryModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#7B6F68',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
              Add a new country section to your route planner. You can then add cities and
              destinations under it.
            </p>

            {availableCountries.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#8A7A70',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                  }}
                >
                  Current Countries in this Trip
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {availableCountries.map((country) => (
                    <span
                      key={country.countryId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#FEF3C7',
                        color: '#92400E',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <span>{country.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCountry(country.countryId)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#B45309',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0',
                        }}
                        title={`Remove ${country.name}`}
                        aria-label={`Remove ${country.name}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAddCountry}>
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#401C02',
                    marginBottom: '6px',
                  }}
                >
                  Country Name
                </div>
                <CountryAutocomplete
                  value={newCountrySelection}
                  onChange={setNewCountrySelection}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddCountryModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #D9D9D9',
                    background: '#FFFFFF',
                    color: '#401C02',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newCountrySelection.length === 0}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#E9724C',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Add Country
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingCountryRemoval && (
        <div
          className="workspace-country-confirm-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setPendingCountryRemoval(null);
            }
          }}
        >
          <button
            type="button"
            className="workspace-country-confirm-backdrop"
            aria-label="Close remove country confirmation"
            tabIndex={-1}
            onClick={() => setPendingCountryRemoval(null)}
          />
          <div
            ref={countryRemovalDialogRef}
            className="workspace-country-confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-remove-country-title"
            aria-describedby="workspace-remove-country-description"
          >
            <div className="workspace-country-confirm-icon" aria-hidden="true">
              <Trash2 size={21} />
            </div>
            <h2 id="workspace-remove-country-title">Remove Country?</h2>
            <p id="workspace-remove-country-description">
              {pendingCountryRemoval.destinationCount === 0 ? (
                <>
                  Are you sure you want to remove {pendingCountryRemoval.countryName} from
                  this trip?
                </>
              ) : (
                <>
                  Are you sure you want to remove {pendingCountryRemoval.countryName} and
                  its {pendingCountryRemoval.destinationCount}{' '}
                  {pendingCountryRemoval.destinationCount === 1
                    ? 'destination'
                    : 'destinations'}{' '}
                  from this trip?
                </>
              )}
            </p>
            <div className="workspace-country-confirm-actions">
              <button
                ref={countryRemovalCancelRef}
                type="button"
                className="workspace-country-confirm-cancel"
                onClick={() => setPendingCountryRemoval(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="workspace-country-confirm-remove"
                onClick={confirmCountryRemoval}
              >
                Remove Country
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
