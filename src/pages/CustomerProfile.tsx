import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronDown, X, BookOpen, Calendar } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';
import { tripsApi } from '../services/api';
import { mergeTripsWithExtras } from '../lib/tripExtras';
import { getCoordinatesForName } from '../constants/coordinates';
import { GlobeMap } from '../components';
import type { Trip } from '../types/trip';
import '../styles/CustomerProfile.css';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

function getStoredJournals(userId?: string | number): JournalEntry[] {
  if (!userId) return [];
  try {
    const stored = localStorage.getItem(`lakbye_journals_${userId}`);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn('Failed to load stored journals:', e);
  }
  return [];
}

export default function CustomerProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [prevUserId, setPrevUserId] = useState<string | number | undefined>(user?.id);
  const [journals, setJournals] = useState<JournalEntry[]>(() =>
    getStoredJournals(user?.id),
  );
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [newJournalTitle, setNewJournalTitle] = useState('');
  const [newJournalContent, setNewJournalContent] = useState('');

  // Sync journals state when user transitions without triggering effect cascading renders
  if (user?.id !== prevUserId) {
    setPrevUserId(user?.id);
    setJournals(getStoredJournals(user?.id));
  }

  const userName = user?.full_name || 'Traveler';
  const avatarUrl = user && 'avatar_url' in user ? (user as { avatar_url?: string }).avatar_url : undefined;

  // Compute initials for the avatar circle
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Load user trips
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    // Fetch user trips for live stats & globe pins
    tripsApi
      .getTrips()
      .then((data) => {
        if (cancelled) return;
        const merged = mergeTripsWithExtras(data);
        setTrips(merged);
      })
      .catch((err) => {
        console.error('Failed to load trips for customer profile:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Extract globe markers from trips
  const globeMarkers = useMemo(() => {
    const markers: { id: string; lng: number; lat: number; title: string }[] = [];

    trips.forEach((trip) => {
      (trip.countries || []).forEach((country, idx) => {
        const coords = getCoordinatesForName(country);
        if (coords) {
          markers.push({
            id: `pin-${trip.id}-${idx}`,
            lng: coords[0],
            lat: coords[1],
            title: `${country} (${trip.name})`,
          });
        }
      });
    });

    return markers;
  }, [trips]);

  const placesCount = globeMarkers.length;

  const handleCreateJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJournalTitle.trim() || !user) return;

    const entry: JournalEntry = {
      id: `journal-${Date.now()}`,
      title: newJournalTitle.trim(),
      content: newJournalContent.trim(),
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };

    const updated = [entry, ...journals];
    setJournals(updated);
    try {
      localStorage.setItem(`lakbye_journals_${user.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save journal to localStorage:', e);
    }

    setNewJournalTitle('');
    setNewJournalContent('');
    setIsJournalModalOpen(false);
  };

  return (
    <div className="customer-profile-page">
      {/* Top Back Navigation (Figma #691:49) */}
      <button
        type="button"
        className="customer-profile-back-nav"
        onClick={() => navigate(ROUTES.DASHBOARD)}
        aria-label="Back to Home Dashboard"
      >
        <ArrowLeft size={16} color="rgba(72, 42, 19, 0.95)" strokeWidth={2.5} />
        <div className="customer-profile-back-text">
          <span className="customer-profile-back-label">Back to</span>
          <span className="customer-profile-back-title">Home</span>
        </div>
      </button>

      {/* Two-Column Grid */}
      <div className="customer-profile-grid">
        {/* Left Column: Profile Card, CTA, & Journals */}
        <div className="customer-profile-left-col">
          {/* Profile Card (#590:191) */}
          <div className="customer-profile-card">
            <div 
              className="customer-profile-avatar-circle" 
              style={{ overflow: 'hidden', display: 'flex', padding: 0 }}
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={userName} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                initials
              )}
            </div>
            <h1 className="customer-profile-user-name">{userName}</h1>

            <div className="customer-profile-stats-row">
              {/* Trips */}
              <div className="customer-profile-stat-box">
                <div className="customer-profile-stat-number">{trips.length}</div>
                <div className="customer-profile-stat-label">Trips</div>
              </div>

              {/* Divider Line (#590:189) */}
              <div className="customer-profile-stats-divider"></div>

              {/* Journal Entry */}
              <div className="customer-profile-stat-box">
                <div className="customer-profile-stat-number">{journals.length}</div>
                <div className="customer-profile-stat-label">Journal Entry</div>
              </div>
            </div>
          </div>

          {/* "Create a Journal Entry" Gradient CTA (#590:201) */}
          <button
            type="button"
            className="customer-profile-create-journal-btn"
            onClick={() => setIsJournalModalOpen(true)}
          >
            <Plus size={16} strokeWidth={3} />
            <span>Create a Journal Entry</span>
          </button>

          {/* Journal Section (#691:64) */}
          <div className="customer-profile-journal-section">
            <h2 className="customer-profile-journal-title">{userName}’s Journal</h2>

            {/* Journal Card Container (#691:74) */}
            <div className="customer-profile-journal-card">
              {journals.length === 0 ? (
                /* Empty State (#590:330, #590:331) */
                <div className="customer-profile-journal-empty">
                  <div className="customer-profile-journal-empty-main">
                    No journal entries published yet
                  </div>
                  <div className="customer-profile-journal-empty-sub">
                    Publish your first journal entry
                  </div>
                </div>
              ) : (
                /* Populated Journal List */
                <div className="customer-profile-journal-list">
                  {journals.map((j) => (
                    <div key={j.id} className="customer-profile-journal-item">
                      <div className="customer-profile-journal-item-header">
                        <h3 className="customer-profile-journal-item-title">{j.title}</h3>
                        <span className="customer-profile-journal-item-date">
                          <Calendar size={12} />
                          {j.createdAt}
                        </span>
                      </div>
                      {j.content && (
                        <p className="customer-profile-journal-item-content">
                          {j.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Map Card (#590:208) */}
        <div className="customer-profile-map-card">
          {/* 3D Mapbox Globe Container */}
          <div className="customer-profile-globe-container">
            <GlobeMap markers={globeMarkers} showRouteLines={false} />
          </div>

          {/* Map Card Footer Bar */}
          <div className="customer-profile-map-footer">
            <div className="customer-profile-map-info">
              <h3 className="customer-profile-map-title">{userName}’s Map</h3>
              <p className="customer-profile-map-subtitle">
                {trips.length} Lists | {placesCount} Places
              </p>
            </div>

            {/* Explore Button Pill (#590:196) */}
            <Link to="/dashboard/map" className="customer-profile-map-explore-btn">
              <span>Explore</span>
              <ChevronDown size={11} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>

      {/* Create Journal Entry Modal */}
      {isJournalModalOpen && (
        <div className="journal-modal-overlay" role="dialog" aria-modal="true">
          <div
            className="journal-modal-backdrop"
            onClick={() => setIsJournalModalOpen(false)}
            aria-hidden="true"
          />
          <div className="journal-modal-content">
            <div className="journal-modal-header">
              <h3 className="journal-modal-title">
                <BookOpen size={18} style={{ display: 'inline', marginRight: '8px' }} />
                New Journal Entry
              </h3>
              <button
                type="button"
                className="journal-modal-close-btn"
                onClick={() => setIsJournalModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateJournal}>
              <div style={{ marginBottom: '14px' }}>
                <label
                  htmlFor="journalTitle"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: '#374151',
                  }}
                >
                  Entry Title
                </label>
                <input
                  id="journalTitle"
                  type="text"
                  value={newJournalTitle}
                  onChange={(e) => setNewJournalTitle(e.target.value)}
                  placeholder="e.g. My First Day in Tokyo"
                  required
                  className="journal-modal-input"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="journalContent"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: '#374151',
                  }}
                >
                  Notes & Memories
                </label>
                <textarea
                  id="journalContent"
                  value={newJournalContent}
                  onChange={(e) => setNewJournalContent(e.target.value)}
                  placeholder="Describe your travel memories, favorite sights, or places you explored..."
                  className="journal-modal-textarea"
                />
              </div>

              <div className="journal-modal-actions">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(90deg, #255f85, #e9724c)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Publish Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}