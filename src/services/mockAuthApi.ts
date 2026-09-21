import { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type {
  RegisterPayload,
  LoginPayload,
  AuthResponse,
  MeResponse,
  User,
  UserPreferences,
} from '../types';

const MOCK_USERS_KEY = 'lakbye_mock_users';
const MOCK_SESSION_KEY = 'lakbye_mock_session';
const MOCK_PREFS_PREFIX = 'lakbye_mock_prefs_';

// Helper to simulate Axios errors exactly how the frontend expects them
const throwAxiosError = (status: number, message: string) => {
  const error = new AxiosError(message, status.toString());
  error.response = {
    data: { message },
    status,
    statusText:
      status === 400
        ? 'Bad Request'
        : status === 401
          ? 'Unauthorized'
          : status === 409
            ? 'Conflict'
            : 'Error',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
  error.isAxiosError = true;
  throw error;
};

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getMockUsers = (): (User & { _password?: string })[] => {
  const users = localStorage.getItem(MOCK_USERS_KEY);
  return users ? JSON.parse(users) : [];
};

const saveMockUsers = (users: (User & { _password?: string })[]) => {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
};

export const mockAuthApi = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    await delay(600); // simulate network latency
    const users = getMockUsers();

    if (users.some((u) => u.email === payload.email)) {
      throwAxiosError(409, 'Email is already registered.');
    }

    if (payload.password.length < 8) {
      throwAxiosError(400, 'Password must be at least 8 characters.');
    }

    const newUser: User = {
      id: users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1,
      full_name: payload.full_name,
      email: payload.email,
      role: 'customer',
      created_at: new Date().toISOString(),
    };

    // Keep plain text password just for mock matching
    const mockUserRecord = { ...newUser, _password: payload.password };
    users.push(mockUserRecord);
    saveMockUsers(users);

    const token = `mock-jwt-token-${newUser.id}-${Date.now()}`;
    localStorage.setItem(MOCK_SESSION_KEY, newUser.id.toString());

    return {
      message: 'Registration successful.',
      user: newUser,
      token,
    };
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    await delay(600);
    const users = getMockUsers();

    const userRecord = users.find(
      (u) => u.email === payload.email && u._password === payload.password,
    );

    if (!userRecord) {
      throwAxiosError(401, 'Invalid email or password.');
      throw new Error('Unreachable');
    }

    const token = `mock-jwt-token-${userRecord.id}-${Date.now()}`;
    localStorage.setItem(MOCK_SESSION_KEY, userRecord.id.toString());

    const { _password, ...userWithoutSensitive } = userRecord;

    // Login response shouldn't have created_at per contract
    const loginUser = { ...userWithoutSensitive };
    if ('created_at' in loginUser) {
      delete loginUser.created_at;
    }

    return {
      message: 'Login successful.',
      user: loginUser as User,
      token,
    };
  },

  logout: async (): Promise<{ message: string }> => {
    await delay(300);
    localStorage.removeItem(MOCK_SESSION_KEY);
    return { message: 'Logged out successfully.' };
  },

  getMe: async (): Promise<MeResponse> => {
    await delay(300);
    const sessionId = localStorage.getItem(MOCK_SESSION_KEY);

    if (!sessionId) {
      throwAxiosError(401, 'Unauthorized');
      throw new Error('Unreachable');
    }

    const users = getMockUsers();
    const userRecord = users.find((u) => u.id.toString() === sessionId);

    if (!userRecord) {
      localStorage.removeItem(MOCK_SESSION_KEY);
      throwAxiosError(401, 'Unauthorized');
      throw new Error('Unreachable');
    }

    const { _password, ...userWithoutSensitive } = userRecord;

    const storedPrefsRaw = localStorage.getItem(`${MOCK_PREFS_PREFIX}${sessionId}`);
    const userPrefs: UserPreferences | undefined = storedPrefsRaw
      ? JSON.parse(storedPrefsRaw)
      : userRecord.preferences;

    return {
      user: {
        ...(userWithoutSensitive as User),
        username: userPrefs?.username || userRecord.username,
        preferences: userPrefs,
      },
    };
  },

  savePreferences: async (
    userId: number | string,
    preferences: UserPreferences,
  ): Promise<UserPreferences> => {
    await delay(300);
    const users = getMockUsers();
    const userIndex = users.findIndex((u) => u.id.toString() === userId.toString());

    if (userIndex !== -1) {
      users[userIndex] = {
        ...users[userIndex],
        username: preferences.username || users[userIndex].username,
        preferences,
      };
      saveMockUsers(users);
    }

    localStorage.setItem(`${MOCK_PREFS_PREFIX}${userId}`, JSON.stringify(preferences));

    return preferences;
  },

  getPreferences: async (userId: number | string): Promise<UserPreferences | null> => {
    await delay(200);
    const stored = localStorage.getItem(`${MOCK_PREFS_PREFIX}${userId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // ignore parse error
      }
    }

    const users = getMockUsers();
    const userRecord = users.find((u) => u.id.toString() === userId.toString());
    return userRecord?.preferences || null;
  },

  forgotPassword: async (
    _email: string,
  ): Promise<{
    message: string;
    devResetUrl?: string;
    accountFound?: boolean;
    emailSent?: boolean;
  }> => {
    return {
      message: 'Reset instructions dispatched (mock mode).',
      devResetUrl: 'http://localhost:5173/reset-password?token=mock-token-123',
      accountFound: true,
      emailSent: false,
    };
  },

  resetPassword: async (_payload: {
    token: string;
    password: string;
  }): Promise<{ message: string }> => {
    return {
      message: 'Password reset successfully (mock mode).',
    };
  },
};
