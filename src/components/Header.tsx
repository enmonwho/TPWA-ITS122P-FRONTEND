import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut, ChevronDown, Search, Loader2, User } from 'lucide-react';
import lakByeImg from '../assets/lakbye-logo.png';
import { useAuth } from '../context/AuthContext';
import { usePageLoader } from '../context/PageLoaderContext';
import { ROUTES } from '../lib/constants';
import { userApi } from '../services/api';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search State
  const searchRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ 
    id: number; 
    full_name: string; 
    username: string; 
    avatar_url?: string 
  }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { user, logout, isLoading } = useAuth();
  const { triggerTransition } = usePageLoader();
  const navigate = useNavigate();

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
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Debounced User Search Effect
  useEffect(() => {
    const query = searchQuery.trim();
    
    if (!query) {
      // Wrapped in a timeout to avoid synchronous setState-in-effect linter warnings
      const resetTimer = setTimeout(() => {
        setSearchResults([]);
        setIsSearching(false);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await userApi.searchUsers(query);
        setSearchResults(results);
      } catch (err) {
        console.error('User search failed', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350); // 350ms debounce

    return () => clearTimeout(timer);
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
    navigate(`/${cleanUsername}`);
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
    role === 'admin' ? 'Admin Dashboard' : role === 'staff' ? 'Staff Dashboard' : 'Dashboard';
  const roleDisplay = role === 'admin' ? 'Admin' : role === 'staff' ? 'Staff' : 'Customer';

  // Safely extract avatar URL without using 'any'
  const avatarUrl = (user as { avatar_url?: string } | null)?.avatar_url;

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`} style={{ zIndex: 50 }}>
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

        <div className={`auth-links${menuOpen ? ' auth-links--open' : ''} flex items-center gap-4`}>
          {isLoading ? (
            <div className="header-auth-skeleton" aria-hidden="true" />
          ) : user ? (
            <>
              {/* Traveler Search Bar (Only visible to logged-in users) */}
              <div className="relative hidden md:block" ref={searchRef}>
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Find travelers..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchResults(true);
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    className="pl-9 pr-4 py-2 w-64 bg-stone-100 border border-stone-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white transition-all"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 w-4 h-4 text-stone-400 animate-spin" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchQuery.trim() !== '' && (
                  <div className="absolute top-full mt-2 w-full bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden flex flex-col max-h-80 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-center text-sm text-stone-500">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      <div className="flex flex-col py-1">
                        <span className="px-3 py-1.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                          Travelers
                        </span>
                        {searchResults
                          .filter((res) => Boolean(res.username))
                          .map((res) => (
                            <button
                              key={res.id}
                              onClick={() => handleUserSelect(res.username)}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition-colors text-left w-full"
                            >
                             <div className="w-8 h-8 rounded-full bg-stone-200 flex flex-shrink-0 items-center justify-center text-stone-500 text-xs font-bold overflow-hidden">
                               {res.avatar_url ? (
                                 <img src={res.avatar_url} alt={res.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                               ) : (
                                 <User size={14} />
                               )}
                             </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-bold text-stone-800 truncate">
                                  {res.full_name}
                                </span>
                                <span className="text-xs text-stone-500 truncate">
                                  @{res.username ? res.username.replace(/^@+/, '') : 'traveler'}
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-stone-500">No travelers found.</div>
                    )}
                  </div>
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
                  <span className="header-avatar-circle" aria-hidden="true" style={{ overflow: 'hidden', display: 'flex', padding: 0 }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
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
                      <div className="header-dropdown-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
    </header>
  );
}