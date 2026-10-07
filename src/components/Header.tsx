import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronDown,
  Search,
  Loader2,
  User,
} from 'lucide-react';
import lakByeImg from '../assets/lakbye-logo.png';
import { useAuth } from '../context/AuthContext';
import { usePageLoader } from '../context/PageLoaderContext';
import { ROUTES } from '../lib/constants';
import { userApi } from '../services/api';
import AnchoredPopover from './AnchoredPopover';
import {
  createLatestRequestGuard,
  dedupeTravelerResults,
  type TravelerSearchResult,
} from '../lib/travelerSearch';
import { openPublicProfile } from '../lib/publicProfile';
import PublicProfileModal from './PublicProfileModal';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search State
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchRequestGuardRef = useRef(createLatestRequestGuard());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TravelerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { user, logout, isLoading } = useAuth();
  const { triggerTransition } = usePageLoader();
  const navigate = useNavigate();
  const location = useLocation();
  const legacyProfileUsername = (
    location.state as { openPublicProfile?: string } | null
  )?.openPublicProfile?.replace(/^@+/, '');
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(
    null,
  );

  // Canonical public-profile open path for search, legacy links, and other callers.
  useEffect(() => {
    const handleOpenProfileEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ username: string }>;
      if (customEvent.detail?.username) {
        setSelectedProfileUsername(customEvent.detail.username.replace(/^@+/, ''));
      }
    };
    window.addEventListener('lakbye:open-profile', handleOpenProfileEvent);
    return () => {
      window.removeEventListener('lakbye:open-profile', handleOpenProfileEvent);
    };
  }, []);

  useEffect(() => {
    if (!legacyProfileUsername) return;
    openPublicProfile(legacyProfileUsername);
    navigate(location.pathname, { replace: true, state: null });
  }, [legacyProfileUsername, location.pathname, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      const target = event.target as Node;
      const clickedSearchPopover =
        target instanceof Element && target.closest('.header-traveler-results') !== null;
      if (
        searchRef.current &&
        !searchRef.current.contains(target) &&
        !clickedSearchPopover
      ) {
        setSearchExpanded(false);
        setShowSearchResults(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setShowSearchResults(false);
        setSearchExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (searchExpanded) {
      const focusTimer = window.setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => window.clearTimeout(focusTimer);
    }
    searchInputRef.current?.blur();
  }, [searchExpanded]);

  // Debounced User Search Effect
  useEffect(() => {
    const query = searchQuery.trim();

    searchAbortRef.current?.abort();
    const requestId = searchRequestGuardRef.current.begin();

    if (!query) {
      return;
    }

    const timer = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setIsSearching(true);
      try {
        const results = await userApi.searchUsers(query, controller.signal);
        if (searchRequestGuardRef.current.isCurrent(requestId)) {
          setSearchResults(dedupeTravelerResults(results));
        }
      } catch (err) {
        if (
          !controller.signal.aborted &&
          searchRequestGuardRef.current.isCurrent(requestId)
        ) {
          console.error('User search failed', err);
          setSearchResults([]);
        }
      } finally {
        if (searchRequestGuardRef.current.isCurrent(requestId)) {
          setIsSearching(false);
        }
      }
    }, 350); // 350ms debounce

    return () => {
      clearTimeout(timer);
      searchAbortRef.current?.abort();
    };
  }, [searchQuery]);

  const handleLinkClick = () => {
    setMenuOpen(false);
    setDropdownOpen(false);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMenuOpen(false);
    try {
      await triggerTransition(async () => {
        await logout();
        navigate(ROUTES.HOME);
      }, 600);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };
  const handleUserSelect = (username?: string | null) => {
    if (!username) return;
    const cleanUsername = username.replace(/^@+/, '');
    setSelectedProfileUsername(cleanUsername);
    setShowSearchResults(false);
    setSearchExpanded(false);
    setSearchQuery('');
    handleLinkClick();
  };

  const firstName = user?.full_name ? user.full_name.trim().split(/\s+/)[0] : 'Traveler';

  const initials = user?.full_name
    ? user.full_name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const role = user?.role?.toLowerCase() || '';
  const dashboardRoute =
    role === 'admin' ? ROUTES.ADMIN : role === 'staff' ? ROUTES.STAFF : ROUTES.DASHBOARD;
  const dashboardLabel =
    role === 'admin'
      ? 'Admin Dashboard'
      : role === 'staff'
        ? 'Staff Dashboard'
        : 'Dashboard';
  const roleDisplay =
    role === 'admin' ? 'Admin' : role === 'staff' ? 'Staff' : 'Customer';

  // Safely extract avatar URL without using 'any'
  const avatarUrl = (user as { avatar_url?: string } | null)?.avatar_url;

  return (
    <header
      className={`site-header${scrolled ? ' scrolled' : ''}`}
      style={{ zIndex: 50 }}
    >
      <nav className="nav-container" aria-label="Main navigation">
        <Link to="/" className="logo" onClick={handleLinkClick}>
          <img src={lakByeImg} alt="LakBye Logo" className="header-logo-img" />
        </Link>

        <button
          className="mobile-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <span className={`hamburger-icon${menuOpen ? ' open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <div
          className={`auth-links${menuOpen ? ' auth-links--open' : ''} flex items-center gap-4`}
        >
          {isLoading ? (
            <div className="header-auth-skeleton" aria-hidden="true" />
          ) : user && user.is_verified !== false ? (
            <>
              {/* Traveler Search Bar (Only visible to logged-in users) */}
              <div
                className={`header-traveler-search${searchExpanded ? ' is-expanded' : ''}`}
                ref={searchRef}
              >
                <div className="header-traveler-search-control">
                  <button
                    type="button"
                    className="header-traveler-search-toggle"
                    aria-label={
                      searchExpanded ? 'Close traveler search' : 'Open traveler search'
                    }
                    aria-expanded={searchExpanded}
                    onClick={() => {
                      setSearchExpanded((expanded) => !expanded);
                      if (searchExpanded) setShowSearchResults(false);
                    }}
                  >
                    <Search size={19} aria-hidden="true" />
                  </button>
                  <input
                    ref={searchInputRef}
                    type="text"
                    maxLength={100}
                    aria-label="Find travelers"
                    placeholder="Find travelers"
                    value={searchQuery}
                    onChange={(e) => {
                      const nextQuery = e.target.value;
                      setSearchQuery(nextQuery);
                      setSearchResults([]);
                      setIsSearching(Boolean(nextQuery.trim()));
                      setShowSearchResults(Boolean(nextQuery.trim()));
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    tabIndex={searchExpanded ? 0 : -1}
                    className="header-traveler-search-input"
                  />
                  {isSearching && (
                    <Loader2
                      className="header-traveler-search-loader animate-spin"
                      aria-label="Searching"
                    />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchQuery.trim() !== '' && (
                  <AnchoredPopover
                    anchorRef={searchRef}
                    onClose={() => setShowSearchResults(false)}
                    matchAnchorWidth
                    estimatedHeight={240}
                    className="header-traveler-results"
                    role="listbox"
                  >
                    {isSearching ? (
                      <div className="p-4 text-center text-sm text-stone-500">
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="header-traveler-search-list">
                        <span className="header-traveler-search-heading">TRAVELERS</span>
                        {searchResults
                          .filter((res) => Boolean(res.username))
                          .map((res) => (
                            <button
                              key={res.id}
                              onClick={() => handleUserSelect(res.username)}
                              className="header-traveler-search-row"
                            >
                              <div className="header-traveler-search-avatar">
                                {res.avatar_url ? (
                                  <img
                                    src={res.avatar_url}
                                    alt={res.full_name}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                    }}
                                  />
                                ) : (
                                  <User size={14} />
                                )}
                              </div>
                              <div className="header-traveler-search-copy">
                                <span className="header-traveler-search-name">
                                  {res.full_name}
                                </span>
                                <span className="header-traveler-search-handle">
                                  @
                                  {res.username
                                    ? res.username.replace(/^@+/, '')
                                    : 'traveler'}
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    ) : (
                      <div className="header-traveler-search-empty">
                        No travelers found
                      </div>
                    )}
                  </AnchoredPopover>
                )}
              </div>

              {/* User Avatar Dropdown */}
              <div className="header-user-menu-container" ref={dropdownRef}>
                <button
                  type="button"
                  className={`header-user-trigger${dropdownOpen ? ' active' : ''}`}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  id="header-user-menu-button"
                >
                  <span className="header-greeting">
                    Hello, <span className="header-greeting-name">{firstName}</span>
                  </span>
                  <span
                    className="header-avatar-circle"
                    aria-hidden="true"
                    style={{ overflow: 'hidden', display: 'flex', padding: 0 }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '50%',
                        }}
                      />
                    ) : (
                      initials
                    )}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`header-chevron${dropdownOpen ? ' rotated' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {dropdownOpen && (
                  <div
                    className="header-dropdown-menu"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="header-user-menu-button"
                  >
                    <div className="header-dropdown-profile">
                      <div
                        className="header-dropdown-avatar"
                        style={{ overflow: 'hidden', padding: 0 }}
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="header-dropdown-info">
                        <p className="header-dropdown-name">{user.full_name}</p>
                        <p className="header-dropdown-email">{user.email}</p>
                      </div>
                      <span className={`header-role-badge badge-${role}`}>
                        {roleDisplay}
                      </span>
                    </div>

                    <div className="header-dropdown-divider" />

                    <Link
                      to={dashboardRoute}
                      className="header-dropdown-item"
                      role="menuitem"
                      onClick={handleLinkClick}
                      id="header-nav-dashboard"
                    >
                      <LayoutDashboard size={18} className="header-dropdown-icon" />
                      <span>{dashboardLabel}</span>
                    </Link>

                    <Link
                      to={ROUTES.PROFILE_SETTINGS}
                      className="header-dropdown-item"
                      role="menuitem"
                      onClick={handleLinkClick}
                      id="header-nav-settings"
                    >
                      <Settings size={18} className="header-dropdown-icon" />
                      <span>Settings</span>
                    </Link>

                    <div className="header-dropdown-divider" />

                    <button
                      type="button"
                      className="header-dropdown-item header-dropdown-logout"
                      role="menuitem"
                      onClick={handleLogout}
                      id="header-nav-logout"
                    >
                      <LogOut size={18} className="header-dropdown-icon" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="btn-login hover-underline"
                onClick={handleLinkClick}
                id="header-btn-login"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="btn-signup hover-lift"
                onClick={handleLinkClick}
                id="header-btn-signup"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Public Profile Modal */}
      <PublicProfileModal
        username={selectedProfileUsername}
        isOpen={Boolean(selectedProfileUsername)}
        onClose={() => {
          setSelectedProfileUsername(null);
        }}
      />
    </header>
  );
}
