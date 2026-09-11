import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { COUNTRIES } from '../constants/countries';

interface CountryAutocompleteProps {
  value: string[];
  onChange: (countries: string[]) => void;
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

  const filteredCountries = useMemo(() => {
    if (!search) return COUNTRIES.filter((c) => !value.includes(c));
    const lowerSearch = search.toLowerCase();
    return COUNTRIES.filter(
      (c) => c.toLowerCase().includes(lowerSearch) && !value.includes(c),
    );
  }, [search, value]);

  const handleSelect = (country: string) => {
    onChange([...value, country]);
    setSearch('');
    setIsOpen(false);
  };

  return (
    <div
      className="input-gradient-border"
      style={{
        borderColor: error ? 'red' : undefined,
        position: 'relative',
      }}
      ref={dropdownRef}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
        {value.length > 0 && (
          <span
            style={{
              color: 'var(--color-neutral-950)',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '15px',
              fontWeight: 500,
              marginRight: '8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '150px',
            }}
            title={value.join(', ')}
          >
            {value.join(', ')}
          </span>
        )}
        <input
          type="text"
          className="modal-input"
          placeholder={value.length > 0 ? '' : 'Select countries'}
          value={search}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          style={{ flex: 1, minWidth: '50px' }}
        />
      </div>

      <div
        style={{
          width: '1px',
          height: '24px',
          backgroundColor: 'rgba(0,0,0,0.35)',
          margin: '0 12px',
        }}
      ></div>
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
        }}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <ChevronDown size={14} color="var(--color-neutral-950)" />
      </button>

      {isOpen && (
        <div
          className="popover-container"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 50,
            padding: '8px 0',
          }}
        >
          {filteredCountries.length > 0 ? (
            filteredCountries.map((c) => (
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
              <div
                key={c}
                className="country-suggestion-item"
                onClick={() => handleSelect(c)}
              >
                {c}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '8px 12px',
                color: 'var(--color-neutral-500)',
                fontSize: '14px',
              }}
            >
              No matching countries.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
