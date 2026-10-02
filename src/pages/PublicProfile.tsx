import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { userApi, type PublicProfileResponse } from '../services/api';
import { MapPin, Globe, ArrowLeft } from 'lucide-react';

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  useEffect(() => {
    if (!username) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
    let isMounted = true;
    const resetTimer = window.setTimeout(() => {
      if (!isMounted) return;
      setLoading(true);
      setNotFound(false);
      setProfile(null);
    }, 0);

    async function fetchUser() {
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
        console.error('Failed to fetch user:', err);
        setNotFound(true);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      isMounted = false;
      window.clearTimeout(resetTimer);
    };
  }, [username]);

  const handleBack = () => {
    const state = location.state as { returnTo?: string } | null;
    if (state?.returnTo) navigate(state.returnTo);
    else if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-stone-500 font-medium">Loading profile...</div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold text-stone-900 mb-2">User Not Found</h2>
        <p className="text-sm text-stone-500 mb-6">
          No user exists with the handle @{username?.replace(/^@+/, '')}
        </p>
        <button
          onClick={handleBack}
          className="px-6 py-2.5 bg-stone-900 text-white rounded-full text-sm font-semibold"
        >
          Back to Find Travelers
        </button>
      </div>
    );
  }

  const publicTrips = profile.trips || [];
  const initials = profile.full_name
    ? profile.full_name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div
      style={{
        backgroundColor: '#F8F3EC',
        minHeight: '100vh',
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* Topbar */}
      <header className="w-full h-[74px] border-b border-[rgba(72,42,19,0.1)] px-6 lg:px-12 flex items-center justify-between bg-[#F8F3EC]">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-[22px] font-extrabold text-[#2F1B0C] tracking-tight bg-transparent border-none cursor-pointer"
        >
          LakBye
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="px-5 py-2 rounded-full bg-white text-[#2F1B0C] border border-[rgba(72,42,19,0.16)] text-[12px] font-semibold hover:bg-stone-50 transition cursor-pointer"
          >
            Find Travelers
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-2 rounded-full text-white text-[12px] font-semibold shadow-xs hover:opacity-95 transition cursor-pointer"
            style={{
              background:
                'linear-gradient(90deg, #255F85 0%, #C5283D 33%, #E9724C 67%, #FFC245 100%)',
            }}
          >
            Back to Home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 pb-16">
        <button
          type="button"
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-2 text-[12px] font-semibold text-[#2F1B0C] hover:opacity-75 transition cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Find Travelers
        </button>

        {/* Profile Card */}
        <div className="bg-white border border-[rgba(72,42,19,0.16)] rounded-[14px] p-6 lg:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-[86px] h-[86px] rounded-full overflow-hidden shrink-0 bg-[#B28073] flex items-center justify-center text-white text-[25px] font-bold shadow-inner">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div>
              <h1 className="text-[26px] md:text-[30px] font-bold text-[#2F1B0C] leading-tight">
                {profile.full_name}
              </h1>
              <p className="text-[13px] text-[#74675D] font-normal mt-0.5">
                @{profile.username}
              </p>
              <p className="text-[12px] text-[#74675D] font-normal mt-2 max-w-xl leading-relaxed">
                {profile.bio ||
                  'Sharing public journeys, memorable places, and travel stories across LakBye.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-8 sm:gap-12 shrink-0 border-t md:border-t-0 md:border-l border-[rgba(72,42,19,0.1)] pt-4 md:pt-0 md:pl-8">
            <div className="text-center">
              <div className="text-[28px] font-bold text-[#2F1B0C] leading-none mb-1">
                {publicTrips.length}
              </div>
              <div className="text-[11px] text-[#74675D] font-normal">Public Trips</div>
            </div>
            <div className="text-center">
              <div className="text-[28px] font-bold text-[#2F1B0C] leading-none mb-1">
                {publicTrips.length > 0 ? Math.max(publicTrips.length * 2 - 1, 1) : 0}
              </div>
              <div className="text-[11px] text-[#74675D] font-normal">
                Journal Entries
              </div>
            </div>
          </div>
        </div>

        {/* Public Journeys Section */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-[20px] font-bold text-[#2F1B0C] flex items-center gap-2">
              <span>◎</span> Public Journeys
            </h2>
            <p className="text-[11px] text-[#74675D] mt-0.5">
              Trips this traveler chose to share publicly.
            </p>
          </div>

          {publicTrips.length === 0 ? (
            <div className="bg-white border border-[rgba(72,42,19,0.16)] rounded-[14px] p-12 text-center text-[#74675D] text-sm">
              This traveler has no public trips shared yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {publicTrips.map((trip) => {
                const countriesStr =
                  trip.countries && trip.countries.length > 0
                    ? trip.countries.join(' · ')
                    : 'Destination';
                const nightsStr = trip.nights ? `${trip.nights} days` : 'Trip';

                return (
                  <div
                    key={trip.id}
                    className="bg-white border border-[rgba(72,42,19,0.16)] rounded-[14px] p-3.5 flex flex-col justify-between shadow-xs transition hover:shadow-sm"
                  >
                    <div className="w-full h-[120px] rounded-[12px] overflow-hidden mb-3 bg-[#E3EDF0] relative flex items-center justify-center">
                      {trip.cover_photo ? (
                        <img
                          src={trip.cover_photo}
                          alt={trip.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#255F85] p-4 text-center">
                          <Globe className="w-7 h-7 mb-1 opacity-70" />
                          <span className="text-[13px] font-bold">{trip.name}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3
                        className="text-[14px] font-semibold text-[#2F1B0C] truncate"
                        title={trip.name}
                      >
                        {trip.name}
                      </h3>
                      <div className="text-[11px] text-[#74675D] mt-0.5 truncate">
                        {countriesStr} · {nightsStr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Public Journals and Travel Map Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Public Journals Card */}
          <div className="lg:col-span-7">
            <h2 className="text-[20px] font-bold text-[#2F1B0C] mb-3 flex items-center gap-2">
              <span>✎</span> Public Journals
            </h2>
            <div className="bg-white border border-[rgba(72,42,19,0.16)] rounded-[14px] p-5 shadow-xs min-h-[175px] flex flex-col justify-center">
              {publicTrips.length > 0 ? (
                <div className="space-y-4">
                  <div className="border-b border-stone-100 pb-3 last:border-none last:pb-0">
                    <h3 className="text-[14px] font-semibold text-[#2F1B0C]">
                      Memories from {publicTrips[0]?.name}
                    </h3>
                    <p className="text-[11px] text-[#74675D] mt-1 leading-relaxed">
                      A curated travel journal documenting highlights, side streets, and
                      notable spots across this journey.
                    </p>
                  </div>
                  {publicTrips.length > 1 && (
                    <div className="border-b border-stone-100 pb-3 last:border-none last:pb-0">
                      <h3 className="text-[14px] font-semibold text-[#2F1B0C]">
                        First Day in{' '}
                        {publicTrips[1]?.countries?.[0] || publicTrips[1]?.name}
                      </h3>
                      <p className="text-[11px] text-[#74675D] mt-1 leading-relaxed">
                        A quick memory and notes from the start of the adventure.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-[#74675D] text-[12px] py-4">
                  No public journal entries shared yet.
                </div>
              )}
            </div>
          </div>

          {/* Public Travel Map Card */}
          <div className="lg:col-span-5">
            <h2 className="text-[20px] font-bold text-[#2F1B0C] mb-3 flex items-center gap-2">
              <span>⌖</span> Public Travel Map
            </h2>
            <div className="bg-white border border-[rgba(72,42,19,0.16)] rounded-[14px] p-3.5 shadow-xs min-h-[175px] flex flex-col items-center justify-center">
              <div className="w-full h-[120px] rounded-[12px] bg-[#DBE5E0] flex flex-col items-center justify-center text-[#255F85] relative overflow-hidden">
                <MapPin className="w-6 h-6 text-[#C5283D] mb-1" />
                <span className="text-[12px] font-semibold text-[#2F1B0C]">
                  {publicTrips.length > 0
                    ? `${publicTrips.length} Public ${publicTrips.length === 1 ? 'Journey' : 'Journeys'} Mapped`
                    : 'Global Travel Overview'}
                </span>
                <span className="text-[10px] text-[#74675D] mt-0.5">
                  {publicTrips
                    .flatMap((t) => t.countries || [])
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(', ') || 'No public routes'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function LegacyPublicProfileRedirect() {
  const { username } = useParams<{ username: string }>();
  if (!username) return <Navigate to="/" replace />;
  return (
    <Navigate
      to={`/profile/${encodeURIComponent(username.replace(/^@+/, ''))}`}
      replace
    />
  );
}
