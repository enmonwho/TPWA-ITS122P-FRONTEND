import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { COUNTRY_OPTIONS, getCountryName, type CountryId } from '../lib/countries';

interface CountryAutocompleteProps {
  value: CountryId[];
  onChange: (countryIds: CountryId[]) => void;
  error?: boolean;
}

export function CountryAutocomplete({
  value,
  onChange,
  error,
}: CountryAutocompleteProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Tolerant fuzzy matching for partial inputs (e.g. 'Philippin' -> 'Philippines')
  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase();
    const available = COUNTRY_OPTIONS.filter((country) => !value.includes(country.id));
    if (!query) return available;

    return available.filter((country) => {
      return [country.name, ...country.aliases].some((candidate) => {
        const lower = candidate.toLowerCase();
        if (lower.includes(query)) return true;
        const words = lower.split(/\s+/);
        return words.some((word) => word.startsWith(query) || query.startsWith(word));
      });
    });
  }, [search, value]);

  const handleSelect = (countryId: CountryId) => {
    if (!value.includes(countryId)) {
      onChange([...value, countryId]);
    }
    setSearch('');
    inputRef.current?.focus();
  };

  const handleDeselect = (countryId: CountryId, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(value.filter((id) => id !== countryId));
  };

  return (
    <div
      className="input-gradient-border"
      style={{
        borderColor: error ? 'red' : undefined,
        position: 'relative',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        alignItems: 'center',
        padding: '6px 12px',
        minHeight: '44px',
      }}
      ref={dropdownRef}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Selected Country Badges with Deselect (x) buttons */}
      {value.map((countryId) => {
        const countryName = getCountryName(countryId);
        return (
          <span
            key={countryId}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-full text-xs font-semibold shrink-0 animate-fade-in"
          >
            <span>{countryName}</span>
            <button
              type="button"
              onClick={(e) => handleDeselect(countryId, e)}
              className="w-3.5 h-3.5 rounded-full hover:bg-amber-200/70 flex items-center justify-center transition-colors text-amber-700"
              aria-label={`Deselect ${countryName}`}
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          </span>
        );
      })}

      {/* Search Input */}
      <input
        ref={inputRef}
        type="text"
        className="modal-input"
        placeholder={
          value.length > 0
            ? 'Add more...'
            : 'Search and select countries (e.g. Philippines, Japan)...'
        }
        value={search}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        style={{
          flex: 1,
          minWidth: '120px',
          border: 'none',
          outline: 'none',
          padding: '4px 0',
        }}
      />

      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          padding: '4px',
          marginLeft: 'auto',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label="Toggle country selector"
      >
        <ChevronDown size={14} color="var(--color-neutral-950)" />
      </button>

      {isOpen && (
        <div
          className="popover-container"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            border: '1px solid #e2e8f0',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 60,
            padding: '6px 0',
          }}
        >
          {filteredCountries.length > 0 ? (
            filteredCountries.map((country) => (
              <button
                key={country.id}
                type="button"
                className="country-suggestion-item text-left w-full hover:bg-amber-50/70 transition-colors"
                onClick={() => handleSelect(country.id)}
              >
                {country.name}
              </button>
            ))
          ) : (
            <div
              style={{
                padding: '10px 14px',
                color: 'var(--color-neutral-500)',
                fontSize: '13px',
              }}
            >
              No matching countries found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CountryAutocomplete;
