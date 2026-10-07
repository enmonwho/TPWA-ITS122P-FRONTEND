import { STORAGE_KEYS } from './constants';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createVisitorId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function getOrCreateVisitorId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.VISITOR_ID);
    if (stored && UUID_PATTERN.test(stored)) return stored;
  } catch {
    return createVisitorId();
  }

  const visitorId = createVisitorId();
  try {
    localStorage.setItem(STORAGE_KEYS.VISITOR_ID, visitorId);
  } catch {
    // This visitor ID remains valid for the current page lifetime.
  }
  return visitorId;
}

export function isValidVisitorId(value: string): boolean {
  return UUID_PATTERN.test(value);
}
