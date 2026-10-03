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
    journals: (profile.journals || []).filter((j) => j.visibility === 'public'),
  };
}

export function openPublicProfile(username: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('lakbye:open-profile', {
        detail: { username: username.replace(/^@+/, '') },
      }),
    );
  }
}
