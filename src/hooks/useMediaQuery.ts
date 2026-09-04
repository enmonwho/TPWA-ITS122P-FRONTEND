import { useState, useEffect } from 'react';

/**
 * React hook that tracks whether a CSS media query matches.
 * Uses `window.matchMedia` for real-time updates.
 *
 * @param query - A valid CSS media query string, e.g. `"(min-width: 768px)"`
 * @returns `true` when the media query matches, `false` otherwise.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
