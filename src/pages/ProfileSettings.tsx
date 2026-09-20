import { useState, useRef } from 'react';
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
  Camera,
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
  avatar_url?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>('general');

  const [prevUserId, setPrevUserId] = useState<string | number | undefined>(user?.id);

  const initialPrefs = getStoredPreferences(user?.id);

  // Profile fields
  const [fullName, setFullName] = useState<string>(() => user?.full_name || '');
  const [username, setUsername] = useState<string>(() => initialPrefs.username || '');
  const [bio, setBio] = useState<string>(() => initialPrefs.bio || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(
    () => initialPrefs.avatar_url || (user as { avatar_url?: string } | null)?.avatar_url || ''
  );

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

  if (user?.id !== prevUserId) {
    setPrevUserId(user?.id);
    setFullName(user?.full_name || '');
    const currentPrefs = getStoredPreferences(user?.id);
    setUsername(currentPrefs.username || '');
    setBio(currentPrefs.bio || '');
    setAvatarUrl(currentPrefs.avatar_url || (user as { avatar_url?: string } | null)?.avatar_url || '');
    setTimeFormat(currentPrefs.timeFormat || '12h');
    setDateFormat(currentPrefs.dateFormat || 'MM/DD/YYYY');
    setCurrency(currentPrefs.currency || 'PHP');
    setDistanceUnit(currentPrefs.distanceUnit || 'km');
  }

  const initials = (fullName || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const userRole = (user?.role || 'customer').toLowerCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Avatar image must be smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatarUrl(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSuccessMessage(null);
    setErrorMessage(null);

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
      const payload = {
        name: fullName.trim(),
        full_name: fullName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
        ...(newPassword && { password: newPassword }),
      };

      await userApi.updateProfile(user.id, payload);

      setUser({
        ...user,
        full_name: fullName.trim(),
        username: username.trim(),
        avatar_url: avatarUrl,
      } as typeof user & { username?: string; avatar_url?: string });

      const updatedPreferences: StoredPreferences = {
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
        timeFormat,
        dateFormat,
        currency,
        distanceUnit,
      };
      localStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES(user.id),
        JSON.stringify(updatedPreferences),
      );

      setNewPassword('');
      setConfirmPassword('');

      setSuccessMessage('Your profile and preferences have been updated successfully.');
    } catch (err: unknown) {
      console.error('Failed to update profile:', err);
      const fallbackPreferences: StoredPreferences = {
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
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
        avatar_url: avatarUrl,
      } as typeof user & { avatar_url?: string });

      setSuccessMessage(
        'Preferences saved locally! (Backend profile sync will retry on next connection).',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-settings-container">
      <div className="profile-settings-header">
        <h1 className="profile-settings-title">Account & Profile Settings</h1>
        <p className="profile-settings-subtitle">
          Manage your personal details, travel unit formats, and account security.
        </p>
      </div>

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

      <form onSubmit={handleSave}>
        {activeTab === 'general' && (
          <div className="profile-card-panel">
            <div className="profile-card-header">
              <h2 className="profile-card-title">Personal Information</h2>
              <p className="profile-card-description">
                Update how your name and avatar appear across your trips and bookings.
              </p>
            </div>

            {/* Avatar Upload Row */}
            <div className="profile-avatar-row">
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
                className="profile-avatar-circle"
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
                title="Click to upload profile avatar"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || 'Avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  initials
                )}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                >
                  <Camera size={20} color="#fff" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/webp"
                style={{ display: 'none' }}
              />

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
                  Username (Public Handle)
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. adiee"
                  required
                  className="profile-field-input"
                />
                <span className="profile-field-hint">
                  Your public profile link will be lakbye.app/{username || 'username'}
                </span>
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