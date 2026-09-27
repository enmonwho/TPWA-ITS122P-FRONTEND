export interface LockoutState {
  isLocked: boolean;
  remainingSeconds: number;
  isPermanent: boolean;
  tier: number; // 0: none, 1: 60s, 2: 120s, 3: 300s, 4: permanent
  attempts: number;
}

interface StoredLockoutData {
  attempts: number;
  tier: number;
  lockoutUntil: number | null;
  isPermanent: boolean;
}

const STORAGE_KEY = 'lakbye_login_lockout';

const TIER_COOLDOWNS: Record<number, number> = {
  1: 60, // 60 seconds (1 minute)
  2: 120, // 120 seconds (2 minutes)
  3: 300, // 300 seconds (5 minutes)
};

const MAX_TIER = 4; // Permanent "try again later"

function getStoredData(): StoredLockoutData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        attempts: Number(parsed.attempts) || 0,
        tier: Number(parsed.tier) || 0,
        lockoutUntil: parsed.lockoutUntil ? Number(parsed.lockoutUntil) : null,
        isPermanent: Boolean(parsed.isPermanent),
      };
    }
  } catch {
    // ignore parse error
  }
  return { attempts: 0, tier: 0, lockoutUntil: null, isPermanent: false };
}

function saveStoredData(data: StoredLockoutData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage error
  }
}

/**
 * Get current lockout state.
 * Evaluates timestamp expiry so countdown reflects accurate elapsed wall-clock time.
 */
export function getLockoutState(): LockoutState {
  const data = getStoredData();

  if (data.isPermanent) {
    return {
      isLocked: true,
      remainingSeconds: 0,
      isPermanent: true,
      tier: MAX_TIER,
      attempts: data.attempts,
    };
  }

  if (data.lockoutUntil) {
    const now = Date.now();
    const remainingMs = data.lockoutUntil - now;
    if (remainingMs > 0) {
      return {
        isLocked: true,
        remainingSeconds: Math.ceil(remainingMs / 1000),
        isPermanent: false,
        tier: data.tier,
        attempts: data.attempts,
      };
    } else {
      // Cooldown expired: user is unlocked to try again, but tier remains saved
      // so if they fail again, the cooldown escalates.
      return {
        isLocked: false,
        remainingSeconds: 0,
        isPermanent: false,
        tier: data.tier,
        attempts: data.attempts,
      };
    }
  }

  return {
    isLocked: false,
    remainingSeconds: 0,
    isPermanent: false,
    tier: data.tier,
    attempts: data.attempts,
  };
}

/**
 * Record a failed login attempt.
 * - Initial lockout triggers after 3 consecutive failed attempts (Tier 1: 60s).
 * - Subsequent failures after unlocking escalate cooldown:
 *   Tier 2 (120s) -> Tier 3 (300s) -> Tier 4 ("Try again later").
 */
export function recordFailedAttempt(): LockoutState {
  const current = getStoredData();
  const nextAttempts = current.attempts + 1;

  // Initial threshold: 3 attempts before first lockout
  if (current.tier === 0 && nextAttempts < 3) {
    const updated: StoredLockoutData = {
      ...current,
      attempts: nextAttempts,
    };
    saveStoredData(updated);
    return {
      isLocked: false,
      remainingSeconds: 0,
      isPermanent: false,
      tier: 0,
      attempts: nextAttempts,
    };
  }

  // Escalate tier:
  // If tier was 0, jump to tier 1 (60s).
  // If tier was already >= 1, increment to next tier.
  const nextTier = current.tier === 0 ? 1 : Math.min(current.tier + 1, MAX_TIER);

  if (nextTier >= MAX_TIER) {
    const updated: StoredLockoutData = {
      attempts: nextAttempts,
      tier: MAX_TIER,
      lockoutUntil: null,
      isPermanent: true,
    };
    saveStoredData(updated);
    return {
      isLocked: true,
      remainingSeconds: 0,
      isPermanent: true,
      tier: MAX_TIER,
      attempts: nextAttempts,
    };
  }

  const cooldownSeconds = TIER_COOLDOWNS[nextTier] || 60;
  const lockoutUntil = Date.now() + cooldownSeconds * 1000;

  const updated: StoredLockoutData = {
    attempts: nextAttempts,
    tier: nextTier,
    lockoutUntil,
    isPermanent: false,
  };
  saveStoredData(updated);

  return {
    isLocked: true,
    remainingSeconds: cooldownSeconds,
    isPermanent: false,
    tier: nextTier,
    attempts: nextAttempts,
  };
}

/**
 * Clears lockout data upon successful authentication.
 */
export function clearLockoutState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Formats seconds into clean, human-readable display string without icons:
 * 54s -> "54s"
 * 120s -> "2:00"
 * 95s -> "1:35"
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '0s';
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
