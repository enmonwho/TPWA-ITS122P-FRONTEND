import { adminApi } from '../services/api';

/**
 * Reserved system usernames that cannot be claimed by regular users.
 */
const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'staff',
  'system',
  'support',
  'help',
  'lakbye',
  'official',
  'moderator',
  'mod',
  'null',
  'undefined',
  'test',
  'guest',
  'api',
  'user',
  'owner',
  'security',
  'superuser',
]);

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates that a username complies with "proper name" guidelines:
 * - 3 to 20 characters long
 * - Must start with a letter
 * - Must end with a letter or number
 * - Contains only letters, numbers, underscores (_), and periods (.)
 * - No spaces or consecutive symbols
 * - Not a reserved system handle
 */
export function validateUsernameFormat(username: string): UsernameValidationResult {
  const trimmed = username.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Please enter a username.' };
  }

  if (/\s/.test(username)) {
    return { isValid: false, error: 'Spaces are not allowed in usernames.' };
  }

  if (trimmed.length < 3) {
    return {
      isValid: false,
      error: 'Username must be at least 3 characters.',
    };
  }

  if (trimmed.length > 20) {
    return {
      isValid: false,
      error: 'Username must be 20 characters or fewer.',
    };
  }

  if (!/^[a-zA-Z]/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Username must start with a letter.',
    };
  }

  if (!/[a-zA-Z0-9]$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Username must end with a letter or number.',
    };
  }

  if (/[^a-zA-Z0-9._]/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Only letters, numbers, underscores (_), and periods (.) are allowed.',
    };
  }

  if (/[._]{2,}/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Consecutive dots or underscores are not allowed.',
    };
  }

  if (RESERVED_USERNAMES.has(trimmed.toLowerCase())) {
    return {
      isValid: false,
      error: 'This username is reserved. Please choose another.',
    };
  }

  return { isValid: true };
}

/**
 * Checks if a username is available across known accounts and storage.
 */
export async function checkUsernameAvailability(
  username: string,
  currentUserId?: number | string,
): Promise<{ available: boolean; error?: string }> {
  const formatCheck = validateUsernameFormat(username);
  if (!formatCheck.isValid) {
    return { available: false, error: formatCheck.error };
  }

  const cleanUsername = username.trim().toLowerCase();

  // 1. Check mock users store (localStorage)
  try {
    const rawMock = localStorage.getItem('lakbye_mock_users');
    if (rawMock) {
      const mockUsers = JSON.parse(rawMock);
      if (Array.isArray(mockUsers)) {
        const match = mockUsers.find(
          (u: { id?: number | string; username?: string }) =>
            u.id?.toString() !== currentUserId?.toString() &&
            u.username?.toLowerCase() === cleanUsername,
        );
        if (match) {
          return { available: false, error: 'This username is already taken.' };
        }
      }
    }
  } catch (err) {
    console.warn('Error reading mock users for username check:', err);
  }

  // 2. Check local preferences stores (localStorage side-tables)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('lakbye_preferences_') || key.startsWith('lakbye_mock_prefs_'))
      ) {
        const keyUserId = key.replace(/^(lakbye_preferences_|lakbye_mock_prefs_)/, '');
        if (currentUserId && keyUserId === currentUserId.toString()) {
          continue;
        }

        const dataStr = localStorage.getItem(key);
        if (dataStr) {
          const parsed = JSON.parse(dataStr);
          if (parsed.username && parsed.username.toLowerCase() === cleanUsername) {
            return { available: false, error: 'This username is already taken.' };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error reading local preferences for username check:', err);
  }

  // 3. Query backend users list if accessible
  try {
    const users = await adminApi.getUsers();
    if (Array.isArray(users) && users.length > 0) {
      const match = users.find(
        (u) =>
          u.id?.toString() !== currentUserId?.toString() &&
          ((u.name && u.name.toLowerCase() === cleanUsername) ||
            ((u as { username?: string }).username &&
              (u as { username?: string }).username?.toLowerCase() === cleanUsername)),
      );
      if (match) {
        return { available: false, error: 'This username is already taken.' };
      }
    }
  } catch {
    // Gracefully handle backend 403 or network failure; local check suffices
  }

  return { available: true };
}
