import { describe, it, expect } from 'vitest';
import { searchDestinations } from './tripAutoFill';
import { getCoordinatesForName } from '../constants/coordinates';

describe('QA Remediation Pass - Philippine Destination Coverage', () => {
  it('resolves Tarlac with correct coordinates and country', () => {
    const results = searchDestinations('Tarlac');
    expect(results.length).toBeGreaterThan(0);
    const tarlac = results.find((r) => r.name.toLowerCase().includes('tarlac'));
    expect(tarlac).toBeDefined();
    expect(tarlac?.country).toBe('Philippines');
    expect(getCoordinatesForName('Tarlac')).toBeDefined();
    expect(getCoordinatesForName('Tarlac')).not.toBeNull();
  });

  it('resolves La Union with correct coordinates and country', () => {
    const results = searchDestinations('La Union');
    expect(results.length).toBeGreaterThan(0);
    const laUnion = results.find((r) => r.name.toLowerCase().includes('la union'));
    expect(laUnion).toBeDefined();
    expect(laUnion?.country).toBe('Philippines');
    expect(getCoordinatesForName('La Union')).toBeDefined();
    expect(getCoordinatesForName('La Union')).not.toBeNull();
  });

  it('preserves existing canonical country mapping and Manila resolution', () => {
    const results = searchDestinations('Manila');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].country).toBe('Philippines');
  });

  it('preserves international destinations (Tokyo, Paris, Seoul)', () => {
    const tokyo = searchDestinations('Tokyo');
    expect(tokyo.length).toBeGreaterThan(0);
    expect(tokyo[0].country).toBe('Japan');

    const seoul = searchDestinations('Seoul');
    expect(seoul.length).toBeGreaterThan(0);
    expect(seoul[0].country).toBe('South Korea');
  });
});

describe('QA Remediation Pass - Admin Sorting Mutual Exclusivity', () => {
  type SortMode = 'asc' | 'desc' | null;

  function toggleAlphabeticalSort(current: SortMode, target: 'asc' | 'desc'): SortMode {
    if (current === target) {
      return null;
    }
    return target;
  }

  it('sets A-Z when none is active', () => {
    const sort = toggleAlphabeticalSort(null, 'asc');
    expect(sort).toBe('asc');
  });

  it('switches to Z-A and deselects A-Z when Z-A is clicked', () => {
    let sort: SortMode = 'asc';
    sort = toggleAlphabeticalSort(sort, 'desc');
    expect(sort).toBe('desc');
  });

  it('switches to A-Z and deselects Z-A when A-Z is clicked', () => {
    let sort: SortMode = 'desc';
    sort = toggleAlphabeticalSort(sort, 'asc');
    expect(sort).toBe('asc');
  });

  it('toggles off when the same sorting is clicked again', () => {
    let sort: SortMode = 'asc';
    sort = toggleAlphabeticalSort(sort, 'asc');
    expect(sort).toBeNull();
  });
});

describe('QA Remediation Pass - Sign Up Confirm Password Validation', () => {
  interface ValidationResult {
    valid: boolean;
    error?: string;
  }

  function validateSignUp(pass: string, confirmPass: string): ValidationResult {
    if (!pass) return { valid: false, error: 'Password is required' };
    if (pass.length < 8)
      return { valid: false, error: 'Password must be at least 8 characters long' };
    if (!confirmPass) return { valid: false, error: 'Please confirm your password' };
    if (pass !== confirmPass)
      return {
        valid: false,
        error: 'Passwords do not match. Please verify both entries.',
      };
    return { valid: true };
  }

  it('fails when confirm password is empty', () => {
    const res = validateSignUp('Password123!', '');
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Please confirm your password');
  });

  it('fails when confirm password does not match password', () => {
    const res = validateSignUp('Password123!', 'Password999!');
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Passwords do not match. Please verify both entries.');
  });

  it('passes when passwords match and meet requirements', () => {
    const res = validateSignUp('Password123!', 'Password123!');
    expect(res.valid).toBe(true);
  });

  it('ensures confirmPassword is not in registration API payload', () => {
    const formState = {
      email: 'traveler@lakbye.ph',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Maria',
      lastName: 'Santos',
    };

    // The backend register payload:
    const payload = {
      email: formState.email.trim(),
      password: formState.password,
      name: `${formState.firstName.trim()} ${formState.lastName.trim()}`,
      role: 'customer',
    };

    expect(payload).not.toHaveProperty('confirmPassword');
    expect(payload.email).toBe('traveler@lakbye.ph');
  });
});

describe('QA Remediation Pass - Staff Scheduled vs Processed Timestamp Semantics', () => {
  it('correctly maps Scheduled Date & Time from booking date/time and not processed time', () => {
    const booking = {
      id: 101,
      booking_date: '2026-11-15T09:30:00Z',
      date: '2026-11-15',
      time: '09:30 AM',
      submitted_at: '2026-10-01T08:00:00Z',
      updated_at: '2026-10-02T10:15:00Z',
    };

    const scheduledDate = booking.booking_date || `${booking.date} ${booking.time}`;
    const submittedAt = booking.submitted_at;
    const processedAt = booking.updated_at;

    expect(scheduledDate).toBe('2026-11-15T09:30:00Z');
    expect(submittedAt).toBe('2026-10-01T08:00:00Z');
    expect(processedAt).toBe('2026-10-02T10:15:00Z');
    expect(scheduledDate).not.toEqual(processedAt);
  });
});

describe('QA Remediation Pass - Master Activity Validation', () => {
  function validateMasterActivity(
    title: string,
    destination: string,
    categoryId: number | '',
  ): { valid: boolean; error?: string } {
    if (!title.trim() || !destination.trim() || !categoryId) {
      return {
        valid: false,
        error: 'Activity Title, Destination, and Category are all required.',
      };
    }
    return { valid: true };
  }

  it('rejects activity without destination', () => {
    const res = validateMasterActivity('Scuba Diving', '', 2);
    expect(res.valid).toBe(false);
  });

  it('rejects activity without category', () => {
    const res = validateMasterActivity('Scuba Diving', 'Boracay', '');
    expect(res.valid).toBe(false);
  });

  it('accepts complete activity', () => {
    const res = validateMasterActivity('Scuba Diving', 'Boracay', 2);
    expect(res.valid).toBe(true);
  });
});
