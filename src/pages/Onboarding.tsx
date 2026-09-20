import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { usePageLoader } from '../context/PageLoaderContext';
import { ROUTES } from '../lib/constants';
import { fetchExchangeRates } from '../lib/currency';
import { preferencesApi } from '../services/api';
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

/**
 * Onboarding — single page at /onboarding with internal step state.
 *
 * Step 1 ("username"):  Enter a username with live "Available" indicator and strict proper name rules.
 * Step 2 ("preferences"): Set Time Format, Date Format, Currency, Distance Unit.
 *
 * Persists preferences to backend API and resilient local storage cache, then routes to Dashboard.
 */

/* ────────── Cloud layout data ────────── */
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

/* ────────── Component ────────── */

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const { triggerTransition } = usePageLoader();
  const navigate = useNavigate();

  const [step, setStep] = useState<'username' | 'preferences'>('username');

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
      // Pre-fetch and cache exchange rates in the background for selected currency
      fetchExchangeRates(value).catch((err) => {
        console.warn('Failed to pre-cache exchange rates on currency change:', err);
      });
    }
  };

  const handleNextStep = () => {
    if (usernameStatus !== 'valid') return;
    triggerTransition(() => {
      setStep('preferences');
    }, 550);
  };

  const handleDone = async () => {
    const chosenCurrency = preferences.currency || 'PHP';
    // Ensure base exchange rates are cached
    fetchExchangeRates(chosenCurrency).catch(() => {});
    fetchExchangeRates('PHP').catch(() => {});

    const userPreferences = {
      username: username.trim(),
      timeFormat: preferences.timeFormat || '12h',
      dateFormat: preferences.dateFormat || 'MM/DD/YYYY',
      currency: chosenCurrency,
      distanceUnit: preferences.distanceUnit || 'km',
    };

    if (user?.id) {
      try {
        await preferencesApi.savePreferences(user.id, userPreferences);
      } catch (err) {
        console.warn('Backend preferences save caught:', err);
      }

      if (username && setUser) {
        setUser({
          ...user,
          username: username.trim(),
          preferences: userPreferences,
        });
      }
    }

    triggerTransition(() => {
      navigate(ROUTES.DASHBOARD);
    }, 700);
  };

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

      {step === 'username' ? (
        /* ──────── Step 1: Username ──────── */
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
                  handleNextStep();
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
            onClick={handleNextStep}
          >
            Next
          </button>
        </div>
      ) : (
        /* ──────── Step 2: Preferences ──────── */
        <div className="onboarding-card animate-fade-in-up delay-100">
          <h1 className="onboarding-heading">Set your Preferences</h1>
          <p className="onboarding-subtext onboarding-subtext-alt">
            Don&apos;t worry, you can always change these later in your profile settings!
          </p>

          <div className="onboarding-selects-group">
            {/* Time Format */}
            <SelectField
              label="Time Format"
              value={preferences.timeFormat}
              onChange={(v) => handlePreferenceChange('timeFormat', v)}
              options={[
                { value: '12h', label: '12-hour' },
                { value: '24h', label: '24-hour' },
              ]}
            />

            {/* Date Format */}
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

            {/* Currency */}
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

            {/* Distance Unit */}
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

/* ────────── Internal SelectField ────────── */

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
