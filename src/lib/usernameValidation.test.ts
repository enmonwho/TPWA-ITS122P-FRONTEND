import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUsernameFormat, checkUsernameAvailability } from './usernameValidation';
import { adminApi } from '../services/api';

const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = String(val);
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const key in mockStorage) delete mockStorage[key];
  },
  key: (i: number) => Object.keys(mockStorage)[i] ?? null,
  get length() {
    return Object.keys(mockStorage).length;
  },
};
vi.stubGlobal('localStorage', localStorageMock);

vi.mock('../services/api', () => ({
  adminApi: {
    getUsers: vi.fn(),
  },
}));

describe('usernameValidation', () => {
  describe('validateUsernameFormat', () => {
    it('accepts valid usernames', () => {
      expect(validateUsernameFormat('alice').isValid).toBe(true);
      expect(validateUsernameFormat('travel_guru').isValid).toBe(true);
      expect(validateUsernameFormat('user.123').isValid).toBe(true);
    });

    it('rejects short usernames', () => {
      const res = validateUsernameFormat('al');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('at least 3');
    });

    it('rejects usernames starting with numbers or symbols', () => {
      expect(validateUsernameFormat('1user').isValid).toBe(false);
      expect(validateUsernameFormat('_user').isValid).toBe(false);
      expect(validateUsernameFormat('.user').isValid).toBe(false);
    });

    it('rejects consecutive symbols', () => {
      expect(validateUsernameFormat('user..name').isValid).toBe(false);
      expect(validateUsernameFormat('user__name').isValid).toBe(false);
    });

    it('rejects spaces', () => {
      expect(validateUsernameFormat('user name').isValid).toBe(false);
    });

    it('rejects reserved system names', () => {
      expect(validateUsernameFormat('admin').isValid).toBe(false);
      expect(validateUsernameFormat('support').isValid).toBe(false);
      expect(validateUsernameFormat('lakbye').isValid).toBe(false);
    });
  });

  describe('checkUsernameAvailability', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      localStorage.clear();
    });

    it('returns available: false with format error if invalid format', async () => {
      const res = await checkUsernameAvailability('ab');
      expect(res.available).toBe(false);
      expect(res.status).toBe('taken');
      expect(res.error).toBeDefined();
    });

    it('detects taken username from mock storage', async () => {
      localStorage.setItem(
        'lakbye_mock_users',
        JSON.stringify([{ id: 99, username: 'taken_user' }]),
      );
      const res = await checkUsernameAvailability('taken_user');
      expect(res.available).toBe(false);
      expect(res.status).toBe('taken');
      expect(res.error).toContain('already taken');
    });

    it('returns status: unknown when backend returns 403 or network error', async () => {
      vi.mocked(adminApi.getUsers).mockRejectedValueOnce(new Error('403 Forbidden'));
      const res = await checkUsernameAvailability('unique_explorer');
      expect(res.available).toBe(true);
      expect(res.status).toBe('unknown');
    });

    it('returns status: available when backend confirms no collision', async () => {
      vi.mocked(adminApi.getUsers).mockResolvedValueOnce([
        {
          id: 1,
          name: 'other_user',
          email: 'other@example.com',
          role: 'user',
          is_active: true,
        },
      ]);
      const res = await checkUsernameAvailability('unique_explorer');
      expect(res.available).toBe(true);
      expect(res.status).toBe('available');
    });
  });
});
