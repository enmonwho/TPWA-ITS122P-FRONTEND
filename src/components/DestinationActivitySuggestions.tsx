import { useEffect, useMemo, useState } from 'react';
import { activitiesApi, type ActivityCatalogItem } from '../services/api';
import { isDestinationActivityRecommendation } from '../lib/activityRecommendations';
interface Suggestion {
  id: string;
  name: string;
}

interface RecommendationState {
  key: string;
  suggestions: Suggestion[];
  unavailable: boolean;
}

interface Props {
  area: string;
  country?: string;
  value?: string;
  onChange: (value: string) => void;
}

function toSuggestion(activity: ActivityCatalogItem): Suggestion {
  return {
    id: String(activity.id),
    name: activity.title,
  };
}

export default function DestinationActivitySuggestions({
  area,
  country,
  value,
  onChange,
}: Props) {
  const [isCustomEntryOpen, setIsCustomEntryOpen] = useState(false);
  const [recommendationState, setRecommendationState] = useState<RecommendationState>({
    key: '',
    suggestions: [],
    unavailable: false,
  });
  const lookupKey = `${country?.trim().toLocaleLowerCase() || ''}|${area.trim().toLocaleLowerCase()}`;
  const hasLookupContext = Boolean(country?.trim() && area.trim());
  const isCurrentLookup = recommendationState.key === lookupKey;
  const loading = hasLookupContext && !isCurrentLookup;
  const suggestions = isCurrentLookup ? recommendationState.suggestions : [];
  const unavailable = isCurrentLookup && recommendationState.unavailable;
  const selected = useMemo(
    () =>
      (value || '')
        .split('\n')
        .map((name) => name.trim())
        .filter(Boolean),
    [value],
  );

  useEffect(() => {
    if (!area.trim() || !country?.trim()) {
      return;
    }

    const controller = new AbortController();
    activitiesApi
      .getByDestination(area, country, controller.signal)
      .then((activities) => {
        // Recommendation rows have no linked destination ID. Negative IDs are
        // also accepted for compatibility with older API responses.
        if (!controller.signal.aborted) {
          setRecommendationState({
            key: lookupKey,
            suggestions: activities
              .filter(isDestinationActivityRecommendation)
              .map(toSuggestion),
            unavailable: false,
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRecommendationState({ key: lookupKey, suggestions: [], unavailable: true });
        }
      });
    return () => controller.abort();
  }, [area, country, lookupKey]);

  const addActivity = (name: string) => {
    if (selected.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase()))
      return;
    onChange([...selected, name].join('\n'));
  };

  return (
    <div className="min-w-0" onClick={(event) => event.stopPropagation()}>
      <div className="mb-1 flex flex-wrap gap-1">
        {selected.map((name) => (
          <span
            key={name}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-amber-50 py-0.5 pl-2 pr-1 text-[10px] leading-tight text-[#6B3F20]"
          >
            <span className="min-w-0 truncate">{name}</span>
            <button
              type="button"
              aria-label={`Remove ${name}`}
              onClick={() =>
                onChange(selected.filter((activity) => activity !== name).join('\n'))
              }
              className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold leading-none text-[#9A542F] hover:bg-[#E9724C]/15 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#E9724C]"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="flex min-w-0">
        {isCustomEntryOpen ? (
          <form
            className="flex min-w-0 flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              const input = new FormData(event.currentTarget).get('activity');
              if (typeof input === 'string' && input.trim()) {
                addActivity(input.trim());
                event.currentTarget.reset();
                setIsCustomEntryOpen(false);
              }
            }}
          >
            <input
              name="activity"
              maxLength={100}
              placeholder="Enter custom activity"
              aria-label={`Enter a custom activity for ${area}`}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setIsCustomEntryOpen(false);
                }
              }}
              className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-[#6B3F20] placeholder:font-normal placeholder:text-stone-400"
            />
          </form>
        ) : (
          <select
            aria-label={`Choose an activity for ${area}${country ? `, ${country}` : ''}`}
            value=""
            disabled={loading}
            onChange={(event) => {
              const name = event.target.value;
              if (name === '__CUSTOM_ACTIVITY__') {
                setIsCustomEntryOpen(true);
              } else if (name) {
                addActivity(name);
              }
            }}
            className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-[#6B3F20] disabled:bg-stone-50 disabled:text-stone-400"
          >
            <option value="">
              {loading ? 'Loading activities…' : 'Select activity'}
            </option>
            {suggestions.map((suggestion) => {
              const alreadyAdded = selected.some(
                (item) =>
                  item.toLocaleLowerCase() === suggestion.name.toLocaleLowerCase(),
              );
              return (
                <option
                  key={suggestion.id}
                  value={suggestion.name}
                  disabled={alreadyAdded}
                >
                  {suggestion.name}
                  {alreadyAdded ? ' · Added' : ''}
                </option>
              );
            })}
            <option value="__CUSTOM_ACTIVITY__">+ Custom activity...</option>
          </select>
        )}
      </div>

      {unavailable ? (
        <p className="mt-1 text-[10px] text-stone-500">
          Recommendations could not be loaded. You can add an activity manually.
        </p>
      ) : hasLookupContext && !loading && suggestions.length === 0 ? (
        <p className="mt-1 text-[10px] text-stone-500">
          No activities available for this destination.
        </p>
      ) : null}
    </div>
  );
}
