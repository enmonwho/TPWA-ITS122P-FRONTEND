import { useEffect, useState, useMemo } from 'react';
import { Globe, MapPin, Loader2 } from 'lucide-react';
import { userApi, type PublicProfileResponse } from '../services/api';
import type { Trip } from '../types/trip';
import { useModalBehavior } from '../hooks/useModalBehavior';

export interface PublicProfileModalProps {
  username: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialProfile?: PublicProfileResponse | null;
  initialTab?: 'journal' | 'journey-map';
}

function getTripDuration(trip: Trip): string {
  if (trip.nights) {
    return trip.nights === 1 ? '1 day' : `${trip.nights} days`;
  }
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0) return `${diff} days`;
  }
  return 'Trip';
}

function formatEntryDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const yr = d.getFullYear().toString().slice(-2);
    return `${m}/${day}/${yr}`;
  } catch {
    return dateStr;
  }
}

export default function PublicProfileModal({
  username,
  isOpen,
  onClose,
  initialProfile,
  initialTab = 'journal',
}: PublicProfileModalProps) {
  const [profile, setProfile] = useState<PublicProfileResponse | null>(
    initialProfile || null,
  );
  const [loading, setLoading] = useState<boolean>(!initialProfile);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'journal' | 'journey-map'>(initialTab);

  useModalBehavior(isOpen, onClose, false);

  useEffect(() => {
    if (!isOpen || !username) return;

    if (initialProfile) {
      const timer = window.setTimeout(() => {
        setProfile(initialProfile);
        setLoading(false);
        setNotFound(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const cleanUsername = username.replace(/^@+/, '');
    let isMounted = true;

    async function fetchProfile() {
      // Clear stale state before fetching
      setProfile(null);
      setLoading(true);
      setNotFound(false);

      try {
        const data = await userApi.getUserByUsername(cleanUsername);
        if (!isMounted) return;
        if (!data) {
          setNotFound(true);
        } else {
          setProfile(data);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to fetch public profile:', err);
        setNotFound(true);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [username, isOpen, initialProfile]);

  const publicTrips = useMemo(() => {
    return (profile?.trips || []).filter((t) => t.visibility === 'public');
  }, [profile?.trips]);

  const publicJournals = useMemo(() => {
    return (profile?.journals || []).filter((j) => j.visibility === 'public');
  }, [profile?.journals]);

  const publicPlaces = useMemo(() => {
    const list: string[] = [];
    publicTrips.forEach((t) => {
      if (Array.isArray(t.countries)) {
        t.countries.forEach((c) => {
          if (typeof c === 'string' && c.trim()) list.push(c.trim());
        });
      }
      if (Array.isArray(t.countryRoute)) {
        t.countryRoute.forEach((cr) => {
          const name = typeof cr === 'string' ? cr : cr?.name;
          if (name && typeof name === 'string' && name.trim()) list.push(name.trim());
        });
      }
    });
    return Array.from(new Set(list));
  }, [publicTrips]);

  if (!isOpen) return null;

  const initials = profile?.full_name
    ? profile.full_name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AM';

  return (
    <div className="public-profile-modal-overlay" role="presentation">
      <button
        type="button"
        className="public-profile-backdrop-dismiss"
        onClick={onClose}
        aria-label="Close public profile modal"
      />

      <div
        className="public-profile-modal-shell animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-profile-name"
      >
        <button
          type="button"
          onClick={onClose}
          className="public-profile-modal-close"
          aria-label="Close modal"
        >
          ×
        </button>

        {loading ? (
          <div className="public-profile-modal-loading">
            <Loader2 className="w-8 h-8 text-[#E9724C] animate-spin mb-2" />
            <p className="text-sm font-medium text-[#74675D]">
              Loading traveler profile...
            </p>
          </div>
        ) : notFound || !profile ? (
          <div className="public-profile-modal-notfound">
            <h3 className="text-lg font-bold text-[#2F1B0C] mb-2">User Not Found</h3>
            <p className="text-xs text-[#74675D] mb-6">
              No traveler exists with the handle @{username?.replace(/^@+/, '')}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-full bg-[#2F1B0C] text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="public-profile-modal-body">
            {/* Header Profile Card */}
            <div className="public-profile-header-card">
              <div className="public-profile-header-main">
                <div className="public-profile-avatar-wrap">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="public-profile-avatar-img"
                    />
                  ) : (
                    <div className="public-profile-avatar-fallback">{initials}</div>
                  )}
                </div>

                <div className="public-profile-info-wrap">
                  <h2 id="public-profile-name" className="public-profile-name">
                    {profile.full_name}
                  </h2>
                  <p className="public-profile-username">{`@${profile.username}`}</p>
                  <p className="public-profile-bio">
                    {profile.bio ||
                      'Sharing public journeys, memorable places, and travel stories across LakBye.'}
                  </p>
                </div>
              </div>

              <div className="public-profile-stats-wrap">
                <div className="public-profile-stat-box">
                  <span className="public-profile-stat-count">{publicTrips.length}</span>
                  <span className="public-profile-stat-label">Public Trips</span>
                </div>
                <div className="public-profile-stat-box">
                  <span className="public-profile-stat-count">
                    {publicJournals.length}
                  </span>
                  <span className="public-profile-stat-label">Journal Entries</span>
                </div>
              </div>
            </div>

            {/* Main Content Card with Segmented Selector */}
            <div className="public-profile-content-card">
              <div
                className="public-profile-segmented-control"
                role="tablist"
                aria-label="Profile views"
              >
                <div
                  className={`public-profile-slider-pill ${activeTab === 'journey-map' ? 'slide-right' : 'slide-left'}`}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  role="tab"
                  id="public-profile-tab-journal"
                  aria-selected={activeTab === 'journal'}
                  aria-controls="public-profile-panel-journal"
                  className={`public-profile-tab-btn ${activeTab === 'journal' ? 'active' : ''}`}
                  onClick={() => setActiveTab('journal')}
                >
                  <span>Journal</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  id="public-profile-tab-journey-map"
                  aria-selected={activeTab === 'journey-map'}
                  aria-controls="public-profile-panel-journey-map"
                  className={`public-profile-tab-btn ${activeTab === 'journey-map' ? 'active' : ''}`}
                  onClick={() => setActiveTab('journey-map')}
                >
                  <span>Journey & Map</span>
                </button>
              </div>

              {/* Journal Tab View */}
              {activeTab === 'journal' && (
                <div
                  id="public-profile-panel-journal"
                  role="tabpanel"
                  aria-labelledby="public-profile-tab-journal"
                  className="public-profile-tab-panel"
                >
                  {publicJournals.length === 0 ? (
                    <div className="public-profile-empty-state">
                      <p className="public-profile-empty-text">
                        No public journal entries shared yet.
                      </p>
                    </div>
                  ) : (
                    <div className="public-profile-journal-list">
                      {publicJournals.map((journal) => (
                        <div key={journal.id} className="public-profile-journal-card">
                          <div className="public-profile-journal-header">
                            <h3 className="public-profile-journal-title">
                              {journal.title}
                            </h3>
                            <span className="public-profile-journal-date">
                              {formatEntryDate(journal.createdAt)}
                            </span>
                          </div>

                          {(journal.country ||
                            journal.travel_type ||
                            journal.travelType) && (
                            <div className="public-profile-journal-badges">
                              {journal.country && (
                                <span className="public-profile-journal-badge">
                                  {journal.country}
                                </span>
                              )}
                              {(journal.travel_type || journal.travelType) && (
                                <span className="public-profile-journal-badge">
                                  {journal.travel_type || journal.travelType}
                                </span>
                              )}
                            </div>
                          )}

                          <p className="public-profile-journal-content">
                            {journal.content}
                          </p>

                          {journal.images && journal.images.length > 0 && (
                            <div className="public-profile-journal-images">
                              {journal.images.map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={`${journal.title} attachment ${idx + 1}`}
                                  className="public-profile-journal-image"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Journey & Map Tab View */}
              {activeTab === 'journey-map' && (
                <div
                  id="public-profile-panel-journey-map"
                  role="tabpanel"
                  aria-labelledby="public-profile-tab-journey-map"
                  className="public-profile-tab-panel"
                >
                  {/* Public Journeys */}
                  <div className="public-profile-section-heading">
                    <h3 className="public-profile-section-title">Public Journeys</h3>
                    <p className="public-profile-section-subtitle">
                      Trips this traveler chose to share publicly.
                    </p>
                  </div>

                  {publicTrips.length === 0 ? (
                    <div className="public-profile-empty-state mb-4">
                      <p className="public-profile-empty-text">
                        No public trips shared yet.
                      </p>
                    </div>
                  ) : (
                    <div className="public-profile-trips-list mb-4">
                      {publicTrips.map((trip) => {
                        const destinations =
                          trip.countries && trip.countries.length > 0
                            ? trip.countries.join(' · ')
                            : 'Destination';
                        const duration = getTripDuration(trip);

                        return (
                          <div key={trip.id} className="public-profile-trip-card">
                            <div className="public-profile-trip-cover">
                              {trip.cover_photo ? (
                                <img
                                  src={trip.cover_photo}
                                  alt={trip.name}
                                  className="public-profile-trip-img"
                                />
                              ) : (
                                <div className="public-profile-trip-fallback">
                                  <Globe className="w-5 h-5 mb-1" />
                                  <span>{trip.name}</span>
                                </div>
                              )}
                            </div>
                            <div className="public-profile-trip-details">
                              <h4 className="public-profile-trip-title">{trip.name}</h4>
                              <p className="public-profile-trip-meta">
                                {`${destinations} · ${duration}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Public Travel Map */}
                  <div className="public-profile-section-heading mt-3">
                    <h3 className="public-profile-section-title">Public Travel Map</h3>
                  </div>

                  <div className="public-profile-map-card">
                    <div className="public-profile-map-visual">
                      {publicPlaces.length > 0 ? (
                        <div className="public-profile-map-content">
                          <MapPin className="w-5 h-5 text-[#C5283D] mb-1" />
                          <span className="public-profile-map-places">
                            {publicPlaces.slice(0, 4).join(' · ')}
                          </span>
                        </div>
                      ) : (
                        <div className="public-profile-map-empty">
                          <MapPin className="w-5 h-5 text-[#74675D] opacity-60 mb-1" />
                          <span>No public places mapped yet.</span>
                        </div>
                      )}
                    </div>
                    <div className="public-profile-map-footer">
                      <span className="public-profile-map-subtitle">
                        {`@${profile.username}'s Map · ${publicPlaces.length} public ${publicPlaces.length === 1 ? 'place' : 'places'}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
