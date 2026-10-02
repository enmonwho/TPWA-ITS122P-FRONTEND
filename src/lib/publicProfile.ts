import type { PublicProfileResponse } from '../services/api';

export function sanitizePublicProfile(
  profile: PublicProfileResponse,
): PublicProfileResponse {
  return {
    id: profile.id,
    full_name: profile.full_name,
    username: profile.username,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    trips: (profile.trips || []).filter((trip) => trip.visibility === 'public'),
  };
}
