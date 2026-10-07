import { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Sparkles, X } from 'lucide-react';
import { activitiesApi, type ActivityCatalogItem } from '../services/api';

const FILTERS = [
  'All',
  'Sightseeing',
  'Culture',
  'Nature',
  'Food',
  'Entertainment',
  'Recreation',
] as const;
type Filter = (typeof FILTERS)[number];
interface Suggestion {
  id: string;
  name: string;
  category: string;
  categoryType: string;
  address: string;
}

function matchesFilter(suggestion: Suggestion, filter: Filter): boolean {
  if (filter === 'All') return true;
  const value = (suggestion.category + ' ' + suggestion.categoryType).toLowerCase();
  if (filter === 'Culture')
    return /museum|culture|historic|temple|shrine|church|mosque|monument/.test(value);
  if (filter === 'Nature')
    return /nature|park|garden|beach|natural|national|outdoor|island|hiking/.test(value);
  if (filter === 'Entertainment')
    return /zoo|aquarium|theme park|entertainment/.test(value);
  if (filter === 'Recreation') return /recreation|viewpoint|sport|water|tour/.test(value);
  if (filter === 'Food') return /food|culinary|restaurant|catering/.test(value);
  return (
    !matchesFilter(suggestion, 'Culture') &&
    !matchesFilter(suggestion, 'Nature') &&
    !matchesFilter(suggestion, 'Entertainment') &&
    !matchesFilter(suggestion, 'Recreation') &&
    !matchesFilter(suggestion, 'Food')
  );
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
    category: activity.category || 'Activity',
    categoryType: activity.category_type || '',
    address: activity.destination || '',
  };
}

export default function DestinationActivitySuggestions({
  area,
  country,
  value,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('All');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const selected = useMemo(
    () =>
      (value || '')
        .split('\n')
        .map((name) => name.trim())
        .filter(Boolean),
    [value],
  );

  useEffect(() => {
    if (!open || loaded) return;
    const controller = new AbortController();
    setLoading(true);
    activitiesApi
      .getByDestination(area, country || '', controller.signal)
      .then((activities) => {
        setSuggestions(activities.map(toSuggestion));
        setLoaded(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setUnavailable(true);
          setLoaded(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, loaded, area, country]);

  const addActivity = (name: string) => {
    if (selected.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase()))
      return;
    onChange([...selected, name].join('\n'));
  };
  const filtered = suggestions.filter((suggestion) => matchesFilter(suggestion, filter));

  return (
    <div className="min-w-0" onClick={(event) => event.stopPropagation()}>
      <div className="mb-1 flex flex-wrap gap-1">
        {selected.map((name) => (
          <span
            key={name}
            className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-[#6B3F20]"
          >
            {name}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex max-w-full items-center gap-1 rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-left text-[10px] font-semibold text-[#8A4B2B] hover:bg-amber-50"
      >
        <Sparkles size={12} />
        <span className="truncate">Suggested activities in {area}</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={'Suggested activities in ' + area}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-stone-100 p-4">
              <div>
                <h2 className="text-base font-bold text-[#2F1B0C]">
                  Suggested activities in {area}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  {country || 'Nearby'} · Select LakBye activities to add to your
                  itinerary
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close suggestions"
                className="rounded-full p-1 text-stone-500 hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </header>
            <nav
              className="flex gap-1 overflow-x-auto border-b border-stone-100 px-3 py-2"
              aria-label="Filter activity suggestions"
            >
              {FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={
                    'shrink-0 rounded-full px-3 py-1 text-xs font-medium ' +
                    (filter === item
                      ? 'bg-[#E9724C] text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200')
                  }
                >
                  {item}
                </button>
              ))}
            </nav>
            <div className="overflow-y-auto p-3">
              {loading ? (
                <p className="p-4 text-sm text-stone-500">
                  Loading activities from LakBye...
                </p>
              ) : unavailable ? (
                <Fallback />
              ) : filtered.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filtered.map((suggestion) => {
                    const alreadyAdded = selected.some(
                      (item) =>
                        item.toLocaleLowerCase() === suggestion.name.toLocaleLowerCase(),
                    );
                    return (
                      <article
                        key={suggestion.id}
                        className="rounded-xl border border-stone-200 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-[#2F1B0C]">
                              {suggestion.name}
                            </h3>
                            <span className="mt-1 inline-block rounded-full bg-orange-50 px-2 py-0.5 text-[10px] text-[#9A542F]">
                              {suggestion.category}
                            </span>
                            {suggestion.address && (
                              <p className="mt-2 flex items-start gap-1 text-[11px] text-stone-500">
                                <MapPin size={12} className="mt-0.5 shrink-0" />
                                {suggestion.address}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={alreadyAdded}
                            onClick={() => addActivity(suggestion.name)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#E9724C] px-2 py-1.5 text-[10px] font-semibold text-white disabled:bg-stone-300"
                          >
                            <Plus size={12} />
                            {alreadyAdded ? 'Added' : 'Add to itinerary'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : suggestions.length ? (
                <p className="p-4 text-sm text-stone-500">
                  No activities match this category for {area}.
                </p>
              ) : (
                <Fallback />
              )}
              <form
                className="mt-3 flex gap-2 border-t border-stone-100 pt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const input = new FormData(event.currentTarget).get('activity');
                  if (typeof input === 'string' && input.trim()) {
                    addActivity(input.trim());
                    event.currentTarget.reset();
                  }
                }}
              >
                <input
                  name="activity"
                  maxLength={160}
                  placeholder="Add an activity manually"
                  className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700"
                >
                  Add
                </button>
              </form>
              {selected.length > 0 && (
                <p className="mt-2 text-[11px] text-stone-500">
                  Saved activities: {selected.join(', ')}
                </p>
              )}
            </div>
            <footer className="flex justify-end border-t border-stone-100 p-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-stone-100 px-4 py-2 text-xs font-semibold text-stone-700"
              >
                Done
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );

  function Fallback() {
    return (
      <div className="p-4 text-sm text-stone-500">
        <p>
          {unavailable
            ? 'LakBye activities could not be loaded.'
            : 'No named LakBye activities have been added for this area yet.'}{' '}
          You can add an activity manually.
        </p>
      </div>
    );
  }
}
