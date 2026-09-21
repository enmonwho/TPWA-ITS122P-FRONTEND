import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, CheckCircle2, AlertCircle, Loader2, Camera } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { userApi, preferencesApi } from '../services/api';
import { usePageLoader } from '../context/PageLoaderContext';
import { ROUTES, STORAGE_KEYS } from '../lib/constants';
import { fetchExchangeRates } from '../lib/currency';
import {
  validateUsernameFormat,
  checkUsernameAvailability,
} from '../lib/usernameValidation';
import lakbyeLogo from '../assets/lakbye-logo.png';
import cloud1 from '../assets/cloud-1.svg';
import cloud2 from '../assets/cloud-2.svg';
import cloud3 from '../assets/cloud-3.svg';
import cloud4 from '../assets/cloud-4.svg';
import cloud5 from '../assets/cloud-5.svg';
import type { UserPreferences } from '../types';

/**
 * Onboarding — single page at /onboarding with internal step state.
 *
 * Step 1 ("username"):  Enter a username with live "Available" indicator and strict proper name rules.
 * Step 2 ("avatar"):    Upload a profile picture (Optional).
 * Step 3 ("preferences"): Set Time Format, Date Format, Currency, Distance Unit.
 *
 * Persists preferences to backend API and resilient local storage cache, then routes to Dashboard.
 */

// Cloud layout data
interface CloudConfig {
  src: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  width: string;
  opacity: number;
}

const clouds: CloudConfig[] = [
  { src: cloud1, top: '5%', right: '2%', width: '160px', opacity: 0.46 },
  { src: cloud2, top: '22%', right: '5%', width: '200px', opacity: 0.57 },
  { src: cloud3, top: '55%', right: '0%', width: '250px', opacity: 0.46 },
  { src: cloud4, top: '70%', right: '3%', width: '165px', opacity: 0.55 },
  { src: cloud5, top: '90%', left: '3%', width: '155px', opacity: 0.6 },
  { src: cloud2, top: '5%', left: '0%', width: '200px', opacity: 0.57 },
  { src: cloud3, top: '45%', left: '0%', width: '250px', opacity: 0.46 },
  { src: cloud4, top: '62%', left: '4%', width: '165px', opacity: 0.55 },
];

type UsernameStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'taken';

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const { triggerTransition } = usePageLoader();
  const navigate = useNavigate();

  // Updated steps
  const [step, setStep] = useState<'username' | 'avatar' | 'preferences'>('username');

  /* Step 1 state */
  const [username, setUsername] = useState('');
  const [availabilityResult, setAvailabilityResult] = useState<{
    usernameChecked: string;
    isChecking: boolean;
    available?: boolean;
    error?: string;
  }>({
    usernameChecked: '',
    isChecking: false,
  });

  /* Step 2 state */
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Step 3 state */
  const [preferences, setPreferences] = useState({
    timeFormat: '',
    dateFormat: '',
    currency: '',
    distanceUnit: '',
  });

  // Pre-load existing preferences if available from backend or local storage
  useEffect(() => {
    let isMounted = true;
    if (user?.id) {
      preferencesApi.getPreferences(user.id).then((saved) => {
        if (isMounted && saved) {
          if (saved.username) setUsername(saved.username);
          setPreferences((prev) => ({
            timeFormat: saved.timeFormat || prev.timeFormat,
            dateFormat: saved.dateFormat || prev.dateFormat,
            currency: saved.currency || prev.currency,
            distanceUnit: saved.distanceUnit || prev.distanceUnit,
          }));
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const trimmedUsername = username.trim();
  const formatCheck = trimmedUsername ? validateUsernameFormat(username) : null;

  // Derive username validation & availability status without cascading renders
  let usernameStatus: UsernameStatus = 'idle';
  let usernameError = '';

  if (!trimmedUsername) {
    usernameStatus = 'idle';
  } else if (formatCheck && !formatCheck.isValid) {
    usernameStatus = 'invalid';
    usernameError = formatCheck.error || 'Invalid username format.';
  } else if (
    availabilityResult.usernameChecked !== trimmedUsername ||
    availabilityResult.isChecking
  ) {
    usernameStatus = 'checking';
  } else if (availabilityResult.available === false) {
    usernameStatus = 'taken';
    usernameError = availabilityResult.error || 'This username is already taken.';
  } else if (availabilityResult.available === true) {
    usernameStatus = 'valid';
  }

  // Asynchronous debounced username availability verification
  useEffect(() => {
    if (!trimmedUsername || !formatCheck?.isValid) {
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const availability = await checkUsernameAvailability(trimmedUsername, user?.id);
        if (!isMounted) return;

        setAvailabilityResult({
          usernameChecked: trimmedUsername,
          isChecking: false,
          available: availability.available,
          error: availability.error,
        });
      } catch {
        if (!isMounted) return;
        setAvailabilityResult({
          usernameChecked: trimmedUsername,
          isChecking: false,
          available: true,
        });
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [trimmedUsername, formatCheck?.isValid, user?.id]);

  const handlePreferenceChange = (key: keyof typeof preferences, value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    if (key === 'currency' && value) {
      fetchExchangeRates(value).catch((err) => {
        console.warn('Failed to pre-cache exchange rates on currency change:', err);
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image file must be smaller than 5MB.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleNextStep = (nextStep: 'avatar' | 'preferences') => {
    if (step === 'username' && usernameStatus !== 'valid') return;
    const cleanUsername = username.trim();

    if (user?.id) {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES(user.id));
        const current = stored ? JSON.parse(stored) : {};
        if (cleanUsername) current.username = cleanUsername;
        localStorage.setItem(
          STORAGE_KEYS.USER_PREFERENCES(user.id),
          JSON.stringify(current),
        );
      } catch (err) {
        console.warn('Failed to save interim username:', err);
      }

      if (setUser && cleanUsername) {
        setUser((prev) => (prev ? { ...prev, username: cleanUsername } : null));
      }
    }

    triggerTransition(() => {
      setStep(nextStep);
    }, 550);
  };

  const handleDone = async () => {
    const chosenCurrency = preferences.currency || 'PHP';
    fetchExchangeRates(chosenCurrency).catch(() => {});
    fetchExchangeRates('PHP').catch(() => {});

    const userPreferences: UserPreferences = {
      username: username.trim(),
      timeFormat: preferences.timeFormat || '12h',
      dateFormat: preferences.dateFormat || 'MM/DD/YYYY',
      currency: chosenCurrency,
      distanceUnit: preferences.distanceUnit || 'km',
    };

    if (user?.id) {
      try {
        // 1. Sync Profile (Avatar + Username) to DB
        await userApi.updateProfile(user.id, {
          username: username.trim(),
          ...(avatarUrl && { avatar_url: avatarUrl }),
        });

        // 2. Sync Preferences to DB
        await preferencesApi.savePreferences(user.id, userPreferences);
      } catch (err) {
        console.warn('Backend profile/preferences save caught:', err);
      }

      // 3. Update Session Context
      if (setUser) {
        setUser({
          ...user,
          username: username.trim(),
          ...(avatarUrl && { avatar_url: avatarUrl }),
          preferences: userPreferences,
        } as typeof user & {
          username: string;
          avatar_url?: string;
          preferences: UserPreferences;
        });
      }
    }

    triggerTransition(() => {
      navigate(ROUTES.DASHBOARD);
    }, 700);
  };

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="onboarding-root">
      {/* Scattered decorative clouds */}
      {clouds.map((c, i) => (
        <img
          key={i}
          src={c.src}
          alt=""
          className="onboarding-cloud"
          style={{
            top: c.top,
            left: c.left,
            right: c.right,
            bottom: c.bottom,
            width: c.width,
            opacity: c.opacity,
          }}
        />
      ))}

      {/* Logo — centered, not a link */}
      <img
        src={lakbyeLogo}
        alt="LakBye Logo"
        className="onboarding-logo animate-fade-in-up"
      />

      {step === 'username' && (
        /* Step 1: Username */
        <div className="onboarding-card animate-fade-in-up delay-100">
          <h1 className="onboarding-heading">Enter a Username</h1>
          <p className="onboarding-subtext">
            Double check! You won&apos;t be able to change it.
          </p>

          <div
            className={`onboarding-input-container${
              usernameStatus === 'valid'
                ? ' onboarding-input-container--valid'
                : usernameStatus === 'invalid' || usernameStatus === 'taken'
                  ? ' onboarding-input-container--error'
                  : ''
            }`}
          >
            <input
              type="text"
              className="onboarding-input"
              placeholder="Username"
              value={username}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && usernameStatus === 'valid') {
                  e.preventDefault();
                  handleNextStep('avatar');
                }
              }}
            />
          </div>

          {/* Availability indicator */}
          <div
            className={`onboarding-availability${
              usernameStatus === 'valid'
                ? ' onboarding-availability--valid'
                : usernameStatus === 'checking'
                  ? ' onboarding-availability--checking'
                  : usernameStatus === 'invalid' || usernameStatus === 'taken'
                    ? ' onboarding-availability--invalid'
                    : ''
            }`}
          >
            {usernameStatus === 'checking' && (
              <>
                <Loader2 className="animate-spin text-zinc-500" size={15} />
                <span>Checking availability...</span>
              </>
            )}
            {usernameStatus === 'valid' && (
              <>
                <CheckCircle2 size={15} />
                <span>Available</span>
              </>
            )}
            {(usernameStatus === 'invalid' || usernameStatus === 'taken') && (
              <>
                <AlertCircle size={15} />
                <span>{usernameError}</span>
              </>
            )}
            {usernameStatus === 'idle' && <span>&nbsp;</span>}
          </div>

          <button
            className="onboarding-btn-next"
            disabled={usernameStatus !== 'valid'}
            onClick={() => handleNextStep('avatar')}
          >
            Next
          </button>
        </div>
      )}

      {step === 'avatar' && (
        /* Step 2: Avatar Upload */
        <div className="onboarding-card animate-fade-in-up delay-100">
          <h1 className="onboarding-heading">Choose a Profile Picture</h1>
          <p className="onboarding-subtext">
            Upload a photo so fellow travelers can recognize you.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              margin: '2rem 0',
            }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: '#94a3b8',
                position: 'relative',
                cursor: 'pointer',
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              title="Click to upload image"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div>{initials}</div>
              )}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: '100%',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '6px 0',
                }}
              >
                <Camera size={18} color="#fff" />
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp"
              style={{ display: 'none' }}
            />

            {errorMessage && (
              <p
                style={{
                  color: '#ef4444',
                  fontSize: '13px',
                  marginTop: '1rem',
                  textAlign: 'center',
                }}
              >
                {errorMessage}
              </p>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'none',
                border: 'none',
                color: '#0ea5e9',
                fontWeight: 600,
                fontSize: '14px',
                marginTop: '1rem',
                cursor: 'pointer',
              }}
            >
              Upload from computer
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="onboarding-btn-next"
              style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
              onClick={() => handleNextStep('preferences')}
            >
              Skip
            </button>
            <button
              className="onboarding-btn-next"
              disabled={!avatarUrl}
              onClick={() => handleNextStep('preferences')}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 'preferences' && (
        /* Step 3: Preferences */
        <div className="onboarding-card animate-fade-in-up delay-100">
          <h1 className="onboarding-heading">Set your Preferences</h1>
          <p className="onboarding-subtext onboarding-subtext-alt">
            Don&apos;t worry, you can always change these later in your profile settings!
          </p>

          <div className="onboarding-selects-group">
            <SelectField
              label="Time Format"
              value={preferences.timeFormat}
              onChange={(v) => handlePreferenceChange('timeFormat', v)}
              options={[
                { value: '12h', label: '12-hour' },
                { value: '24h', label: '24-hour' },
              ]}
            />
            <SelectField
              label="Date Format"
              value={preferences.dateFormat}
              onChange={(v) => handlePreferenceChange('dateFormat', v)}
              options={[
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              ]}
            />
            <SelectField
              label="Currency"
              value={preferences.currency}
              onChange={(v) => handlePreferenceChange('currency', v)}
              options={[
                { value: 'PHP', label: 'PHP (₱)' },
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'GBP', label: 'GBP (£)' },
                { value: 'JPY', label: 'JPY (¥)' },
              ]}
            />
            <SelectField
              label="Distance Unit"
              value={preferences.distanceUnit}
              onChange={(v) => handlePreferenceChange('distanceUnit', v)}
              options={[
                { value: 'km', label: 'Kilometers' },
                { value: 'mi', label: 'Miles' },
              ]}
            />
          </div>

          <button className="onboarding-btn-done" onClick={handleDone}>
            I&apos;m all set!
          </button>
        </div>
      )}
    </div>
  );
}

// Internal SelectField
interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div className="onboarding-select-container">
      <select
        className={`onboarding-select${value ? ' has-value' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {label}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="onboarding-select-icon" />
    </div>
  );
}
