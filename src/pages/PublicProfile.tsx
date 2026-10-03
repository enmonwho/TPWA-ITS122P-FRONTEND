import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import PublicProfileModal from '../components/PublicProfileModal';

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const handleClose = () => {
    const state = location.state as { returnTo?: string } | null;
    if (state?.returnTo) {
      navigate(state.returnTo);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div
      className="public-profile-route-container"
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F3EC',
      }}
    >
      <PublicProfileModal
        username={username || null}
        isOpen={Boolean(username)}
        onClose={handleClose}
      />
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
