import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import lakbyeLogo from '../assets/lakbye-logo.png';
import cloud1 from '../assets/cloud-1.svg';
import cloud2 from '../assets/cloud-2.svg';
import cloud3 from '../assets/cloud-3.svg';
import cloud4 from '../assets/cloud-4.svg';
import cloud5 from '../assets/cloud-5.svg';

/**
 * Onboarding — single page at /onboarding with internal step state.
 *
 * Step 1 ("username"):  Enter a username with live "Available" indicator.
 * Step 2 ("preferences"): Set Time Format, Date Format, Currency, Distance Unit.
 *
 * No back navigation between steps; no redirect after completion.
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

/* ────────── Component ────────── */

export default function Onboarding() {
  const [step, setStep] = useState<'username' | 'preferences'>('username');

  /* Step 1 state */
  const [username, setUsername] = useState('');

  /* Step 2 state */
  const [preferences, setPreferences] = useState({
    timeFormat: '',
    dateFormat: '',
    currency: '',
    distanceUnit: '',
  });

  const handlePreferenceChange = (key: keyof typeof preferences, value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleDone = () => {
    console.log('Onboarding complete:', { username, preferences });
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

          <div className="onboarding-input-container">
            <input
              type="text"
              className="onboarding-input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* Availability indicator — visible only when ≥1 char */}
          <span className="onboarding-availability">
            {username.length > 0 ? 'Available' : '\u00A0'}
          </span>

          <button
            className="onboarding-btn-next"
            disabled={username.trim().length === 0}
            onClick={() => setStep('preferences')}
          >
            Next
          </button>
        </div>
      ) : (
        /* ──────── Step 2: Preferences ──────── */
        <div className="onboarding-card animate-fade-in-up delay-100">
          <h1 className="onboarding-heading">Set your Preferences</h1>
          <p className="onboarding-subtext onboarding-subtext--preferences">
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
        className={`onboarding-select${value ? ' onboarding-select--selected' : ''}`}
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
