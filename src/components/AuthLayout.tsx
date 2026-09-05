import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import stampsCollage from '../assets/stamps-collage.png';
import lakbyeLogo from '../assets/lakbye-logo.png';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * AuthLayout — shared responsive layout for Login and Sign Up pages.
 *
 * Breakpoints:
 * - Desktop (≥1024px): Split-screen — collage fills left half, form centered on right
 * - Tablet (768px–1023px): Vertical column — ~35vh collage strip at top, form below
 * - Mobile (<768px): No collage rendered/loaded — cream + tiled texture, full-width form
 *
 * The logo is placed:
 * - Desktop: Overlaid on the collage (existing behavior)
 * - Tablet/Mobile: Standalone above the heading inside the form section
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  // Conditional rendering: don't load the collage image at mobile widths
  const isTabletUp = useMediaQuery('(min-width: 768px)');

  return (
    <div className="auth-root">
      {/*
        Collage section — only rendered at ≥768px.
        On mobile, the image is not loaded at all.
      */}
      {isTabletUp && (
        <div className="auth-collage-section">
          <div className="auth-collage-inner">
            <img src={stampsCollage} alt="Stamps Collage" className="auth-collage-img" />

            {/* Desktop-only logo overlay (positioned absolutely within collage) */}
            <Link
              to="/"
              aria-label="Go to homepage"
              className="auth-collage-logo-link animate-fade-in-up"
            >
              <img src={lakbyeLogo} alt="LakBye Logo" className="auth-collage-logo-img" />
              <p className="auth-collage-tagline">Saan aabot ang Lakbye mo?</p>
            </Link>
          </div>
        </div>
      )}

      {/* Form section */}
      <div className="auth-form-section">
        {/* Standalone logo — visible on tablet and mobile only */}
        <Link
          to="/"
          aria-label="Go to homepage"
          className="auth-standalone-logo-link animate-fade-in-up"
        >
          <img src={lakbyeLogo} alt="LakBye Logo" className="auth-standalone-logo-img" />
        </Link>

        <div className="login-form-container">{children}</div>
      </div>
    </div>
  );
}
