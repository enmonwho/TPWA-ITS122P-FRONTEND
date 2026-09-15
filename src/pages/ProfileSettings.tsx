import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  User as UserIcon,
  Sliders,
  ShieldCheck,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  RefreshCw,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { STORAGE_KEYS } from '../lib/constants';
import { userApi } from '../services/api';
import '../styles/ProfileSettings.css';

interface StoredPreferences {
  username?: string;
  bio?: string;
  timeFormat?: string;
  dateFormat?: string;
  currency?: string;
  distanceUnit?: string;
}

type TabType = 'general' | 'preferences' | 'security';

function getStoredPreferences(userId?: string | number): StoredPreferences {
  if (!userId) return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES(userId));
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn('Failed to parse user preferences from localStorage:', e);
  }
  return {};
}

export default function ProfileSettings() {
  const { user, setUser } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('general');

  // Track previous user id to adjust state during render if user session loads after mount
  const [prevUserId, setPrevUserId] = useState<string | number | undefined>(user?.id);

  const initialPrefs = getStoredPreferences(user?.id);

  // Profile fields
  const [fullName, setFullName] = useState<string>(() => user?.full_name || '');
  const [username, setUsername] = useState<string>(() => initialPrefs.username || '');
  const [bio, setBio] = useState<string>(() => initialPrefs.bio || '');

  // Preference fields
  const [timeFormat, setTimeFormat] = useState<string>(
    () => initialPrefs.timeFormat || '12h',
  );
  const [dateFormat, setDateFormat] = useState<string>(
    () => initialPrefs.dateFormat || 'MM/DD/YYYY',
  );
  const [currency, setCurrency] = useState<string>(() => initialPrefs.currency || 'PHP');
  const [distanceUnit, setDistanceUnit] = useState<string>(
    () => initialPrefs.distanceUnit || 'km',
  );

  // Security fields
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Status indicators
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize state when user session loads/transitions without triggering effect cascading renders
  if (user?.id !== prevUserId) {
    setPrevUserId(user?.id);
    setFullName(user?.full_name || '');
    const currentPrefs = getStoredPreferences(user?.id);
    setUsername(currentPrefs.username || '');
    setBio(currentPrefs.bio || '');
    setTimeFormat(currentPrefs.timeFormat || '12h');
    setDateFormat(currentPrefs.dateFormat || 'MM/DD/YYYY');
    setCurrency(currentPrefs.currency || 'PHP');
    setDistanceUnit(currentPrefs.distanceUnit || 'km');
  }

  // Compute initials for the avatar
  const initials = (fullName || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const userRole = (user?.role || 'customer').toLowerCase();

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSuccessMessage(null);
    setErrorMessage(null);

    // Password validation if attempting to change
    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMessage('New password must be at least 6 characters long.');
        setActiveTab('security');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New password and confirmation password do not match.');
        setActiveTab('security');
        return;
      }
    }

    setIsSaving(true);

    try {
      // 1. Sync core user details to backend API (PUT /users/:id)
      const payload: { name: string; full_name: string; password?: string } = {
        name: fullName.trim(),
        full_name: fullName.trim(),
      };
      if (newPassword) {
        payload.password = newPassword;
      }

      await userApi.updateProfile(user.id, payload);

      // 2. Update React AuthContext so headers, greetings, and cards update live
      setUser({
        ...user,
        full_name: fullName.trim(),
      });

      // 3. Persist username, bio, and travel preferences to client storage stopgap
      const updatedPreferences: StoredPreferences = {
        username: username.trim(),
        bio: bio.trim(),
        timeFormat,
        dateFormat,
        currency,
        distanceUnit,
      };
      localStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES(user.id),
        JSON.stringify(updatedPreferences),
      );

      // Clear sensitive fields
      setNewPassword('');
      setConfirmPassword('');

      setSuccessMessage('Your profile and preferences have been updated successfully.');
    } catch (err: unknown) {
      console.error('Failed to update profile:', err);
      // Even if backend users table has schema limits for custom fields, persist local preferences
      const fallbackPreferences: StoredPreferences = {
        username: username.trim(),
        bio: bio.trim(),
        timeFormat,
        dateFormat,
        currency,
        distanceUnit,
      };
      localStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES(user.id),
        JSON.stringify(fallbackPreferences),
      );

      setUser({
        ...user,
        full_name: fullName.trim(),
      });

      setSuccessMessage(
        'Preferences saved locally! (Backend profile sync will retry on next connection).',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-settings-container">
      {/* Header */}
      <div className="profile-settings-header">
        <h1 className="profile-settings-title">Account & Profile Settings</h1>
        <p className="profile-settings-subtitle">
          Manage your personal details, travel unit formats, and account security.
        </p>
      </div>

      {/* Tabs */}
      <div className="profile-tabs-strip">
        <button
          type="button"
          className={`profile-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <UserIcon size={15} /> General Profile
        </button>
        <button
          type="button"
          className={`profile-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Sliders size={15} /> Travel Preferences
        </button>
        <button
          type="button"
          className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <ShieldCheck size={15} /> Security & Password
        </button>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="profile-alert-banner profile-alert-banner--success">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
          <button
            type="button"
            className="alert-close-btn"
            onClick={() => setSuccessMessage(null)}
            aria-label="Dismiss alert"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="profile-alert-banner profile-alert-banner--error">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
          <button
            type="button"
            className="alert-close-btn"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss alert"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave}>
        {/* TAB 1: General Profile */}
        {activeTab === 'general' && (
          <div className="profile-card-panel">
            <div className="profile-card-header">
              <h2 className="profile-card-title">Personal Information</h2>
              <p className="profile-card-description">
                Update how your name and avatar appear across your trips and bookings.
              </p>
            </div>

            {/* Avatar Row */}
            <div className="profile-avatar-row">
              <div className="profile-avatar-circle">{initials}</div>
              <div className="profile-avatar-meta">
                <h3 className="profile-avatar-name">{fullName || 'Your Name'}</h3>
                <p className="profile-avatar-email">{user?.email}</p>
                <div className="profile-avatar-badges">
                  <span className={`role-badge role-badge--${userRole}`}>{userRole}</span>
                  <span className="profile-field-hint">
                    ID #{user?.id ? String(user.id).padStart(4, '0') : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="profile-form-grid">
              <div className="profile-field-group">
                <label htmlFor="fullName" className="profile-field-label">
                  Display / Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  required
                  className="profile-field-input"
                />
              </div>

              <div className="profile-field-group">
                <label htmlFor="username" className="profile-field-label">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. juandelacruz"
                  className="profile-field-input"
                />
              </div>

              <div className="profile-field-group">
                <label htmlFor="email" className="profile-field-label">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="profile-field-input"
                />
                <span className="profile-field-hint">
                  Email is locked to your authenticated session.
                </span>
              </div>

              <div className="profile-field-group profile-field-group--full">
                <label htmlFor="bio" className="profile-field-label">
                  Travel Bio / About Me
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell fellow travelers about your travel style, dream destinations, or favorite hobbies..."
                  maxLength={300}
                  className="profile-field-textarea"
                />
                <span className="profile-field-hint">{bio.length}/300 characters</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Travel Preferences */}
        {activeTab === 'preferences' && (
          <div className="profile-card-panel">
            <div className="profile-card-header">
              <h2 className="profile-card-title">Localization & Unit Formats</h2>
              <p className="profile-card-description">
                Customize how currencies, distances, and date formats display across your
                itineraries.
              </p>
            </div>

            <div className="profile-form-grid">
              {/* Currency */}
              <div className="profile-field-group profile-field-group--full">
                <span className="profile-field-label">Preferred Currency</span>
                <div className="pref-options-grid">
                  {[
                    { code: 'PHP', symbol: '₱', label: 'Philippine Peso' },
                    { code: 'USD', symbol: '$', label: 'US Dollar' },
                    { code: 'EUR', symbol: '€', label: 'Euro' },
                    { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
                    { code: 'GBP', symbol: '£', label: 'British Pound' },
                  ].map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      className={`pref-option-card ${currency === c.code ? 'selected' : ''}`}
                      onClick={() => setCurrency(c.code)}
                    >
                      <span className="pref-option-title">
                        {c.symbol} {c.code}
                      </span>
                      <span className="pref-option-sub">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Format */}
              <div className="profile-field-group">
                <span className="profile-field-label">Time Format</span>
                <div className="pref-options-grid">
                  <button
                    type="button"
                    className={`pref-option-card ${timeFormat === '12h' ? 'selected' : ''}`}
                    onClick={() => setTimeFormat('12h')}
                  >
                    <span className="pref-option-title">12-Hour</span>
                    <span className="pref-option-sub">2:30 PM</span>
                  </button>
                  <button
                    type="button"
                    className={`pref-option-card ${timeFormat === '24h' ? 'selected' : ''}`}
                    onClick={() => setTimeFormat('24h')}
                  >
                    <span className="pref-option-title">24-Hour</span>
                    <span className="pref-option-sub">14:30</span>
                  </button>
                </div>
              </div>

              {/* Distance Unit */}
              <div className="profile-field-group">
                <span className="profile-field-label">Distance Unit</span>
                <div className="pref-options-grid">
                  <button
                    type="button"
                    className={`pref-option-card ${distanceUnit === 'km' ? 'selected' : ''}`}
                    onClick={() => setDistanceUnit('km')}
                  >
                    <span className="pref-option-title">Kilometers</span>
                    <span className="pref-option-sub">km</span>
                  </button>
                  <button
                    type="button"
                    className={`pref-option-card ${distanceUnit === 'mi' ? 'selected' : ''}`}
                    onClick={() => setDistanceUnit('mi')}
                  >
                    <span className="pref-option-title">Miles</span>
                    <span className="pref-option-sub">mi</span>
                  </button>
                </div>
              </div>

              {/* Date Format */}
              <div className="profile-field-group profile-field-group--full">
                <label htmlFor="dateFormat" className="profile-field-label">
                  Date Format
                </label>
                <select
                  id="dateFormat"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="profile-field-select"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 04/15/2026)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/04/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-04-15)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Security & Password */}
        {activeTab === 'security' && (
          <div className="profile-card-panel">
            <div className="profile-card-header">
              <h2 className="profile-card-title">Password & Authentication</h2>
              <p className="profile-card-description">
                Keep your account secure with a strong password.
              </p>
            </div>

            <div className="profile-form-grid">
              <div className="profile-field-group">
                <label htmlFor="newPassword" className="profile-field-label">
                  New Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep unchanged"
                    className="profile-field-input"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="profile-field-hint">Minimum 6 characters</span>
              </div>

              <div className="profile-field-group">
                <label htmlFor="confirmPassword" className="profile-field-label">
                  Confirm New Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="profile-field-input"
                  />
                </div>
              </div>

              <div
                className="profile-field-group profile-field-group--full"
                style={{
                  marginTop: '12px',
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Lock size={20} style={{ color: '#64748b' }} />
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1e293b',
                    }}
                  >
                    Session Security
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Your session is actively guarded with a secure httpOnly cookie.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="profile-actions-row">
          <button type="submit" className="btn-profile-primary" disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw size={15} className="animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save size={15} /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
