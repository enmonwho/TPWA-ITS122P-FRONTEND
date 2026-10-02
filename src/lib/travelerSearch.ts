export interface TravelerSearchResult {
  id: number;
  full_name: string;
  username: string;
  avatar_url?: string;
}

export function normalizeTravelerUsername(username: string): string {
  return username.trim().replace(/^@+/, '').toLowerCase();
}

export function dedupeTravelerResults(
  results: readonly TravelerSearchResult[],
): TravelerSearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const username = normalizeTravelerUsername(result.username || '');
    if (!username) return false;
    const key = `username:${username}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createLatestRequestGuard() {
  let currentRequest = 0;
  return {
    begin(): number {
      currentRequest += 1;
      return currentRequest;
    },
    isCurrent(requestId: number): boolean {
      return requestId === currentRequest;
    },
    invalidate(): void {
      currentRequest += 1;
    },
  };
}

export function getPublicProfilePath(username: string): string {
  const cleanUsername = username.trim().replace(/^@+/, '');
  return `/profile/${encodeURIComponent(cleanUsername)}`;
}
