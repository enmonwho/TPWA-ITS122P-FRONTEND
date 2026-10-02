export function getPersistedCoverReference(
  serverCoverPhoto?: string | null,
): string | null {
  const value = serverCoverPhoto?.trim();
  return value ? value : null;
}
