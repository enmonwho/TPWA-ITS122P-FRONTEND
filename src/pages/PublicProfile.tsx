import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userApi, type PublicProfileResponse } from '../services/api';
import { useAuth } from '../context/AuthContext'; // Import auth hook
import { MapPin, Globe, User, Settings } from 'lucide-react';
import { formatDateOnly } from '../lib/tripExtras';

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth(); // Get current logged-in user

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
    };
  }, [username]);

  // Check if the currently logged-in user is viewing their own public profile
  const isOwner = currentUser && profile && String(currentUser.id) === String(profile.id);

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
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-stone-900 text-white rounded-full text-sm font-semibold"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center bg-white border border-stone-200/80 rounded-3xl p-8 shadow-sm mb-8 relative">
        {/* Only show edit profile button if viewing your own profile */}
        {isOwner && (
          <button
            onClick={() => navigate('/dashboard/settings')}
            className="absolute top-6 right-6 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Settings size={14} /> Edit Profile
          </button>
        )}

        <div className="w-24 h-24 rounded-full bg-stone-200 overflow-hidden flex items-center justify-center text-stone-500 text-2xl font-bold mb-4 shadow-inner">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={40} />
          )}
        </div>
        <h1 className="text-2xl font-bold text-stone-900">{profile.full_name}</h1>
        <p className="text-sm text-stone-500 font-medium mt-0.5">@{profile.username}</p>
        {profile.bio && (
          <p className="text-sm text-stone-600 mt-3 max-w-md">{profile.bio}</p>
        )}
      </div>

      {/* Public Trips Section */}
      <div>
        <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-amber-600" /> Public Journeys
        </h2>

        {!profile.trips || profile.trips.length === 0 ? (
          <div className="bg-white border border-stone-200/80 rounded-2xl p-12 text-center text-stone-500 text-sm">
            This traveler has no public trips shared yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.trips.map((trip) => (
              <div
                key={trip.id}
                role="button"
                tabIndex={0}
                className="..."
                onClick={() => {
                  if (isOwner) navigate(`/trip/${trip.id}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (isOwner) navigate(`/trip/${trip.id}`);
                  }
                }}
              >
                <div>
                  {trip.cover_photo && (
                    <div className="w-full h-36 rounded-xl overflow-hidden mb-4 bg-stone-100">
                      <img
                        src={trip.cover_photo}
                        alt={trip.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <h3 className="text-base font-bold text-stone-900 mb-1">{trip.name}</h3>
                  {trip.countries && trip.countries.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-stone-500 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      <span>{trip.countries.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs font-medium text-stone-500">
                  <span>
                    {formatDateOnly(trip.startDate)} - {formatDateOnly(trip.endDate)}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold uppercase tracking-wider text-[10px]">
                    {trip.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
