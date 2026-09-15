import earthImg from '../assets/earth.png';

interface EarthLoadingScreenProps {
  /** Optional message or status indicator below the earth */
  message?: string;
  /** Whether the loading screen is fading out */
  fadeOut?: boolean;
}

/**
 * EarthLoadingScreen — full-screen loading screen with centered spinning Earth globe.
 * Used during route transitions (landing page to dashboard, login, signup, onboarding)
 * and route protection session checks.
 */
export default function EarthLoadingScreen({
  message,
  fadeOut = false,
}: EarthLoadingScreenProps) {
  return (
    <div
      className={`earth-loading-screen${fadeOut ? ' fade-out' : ''}`}
      role="status"
      aria-label={message || 'Loading page'}
    >
      <div className="earth-loading-content">
        <img src={earthImg} alt="Loading Earth" className="earth-loading-spinner" />
        {message && <p className="earth-loading-message">{message}</p>}
      </div>
      <span className="sr-only">{message || 'Loading…'}</span>
    </div>
  );
}
