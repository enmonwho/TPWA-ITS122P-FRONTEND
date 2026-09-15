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
 * - Desktop (>1180px): Split-screen — collage fills left half, form centered on right
 * - Tablet & Mobile (<=1180px): No collage rendered/loaded — clean cream + tiled texture, centered standalone form
 *
 * The logo is placed:
 * - Desktop (>1180px): Overlaid on the collage
 * - Tablet & Mobile (<=1180px): Standalone above the heading inside the form section
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  // Only load and render the collage on desktop screens wider than 1180px
  const isDesktop = useMediaQuery('(min-width: 1181px)');

  return (
    <div className="auth-root">
      {/*
        Collage section — only rendered at >1180px.
        At <=1180px (including 775px–1180px), the image is not loaded or rendered at all.
      */}
      {isDesktop && (
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
        {/* Standalone logo — visible on tablet and mobile (<=1180px) */}
        {!isDesktop && (
          <Link
            to="/"
            aria-label="Go to homepage"
            className="auth-standalone-logo-link animate-fade-in-up"
          >
            <img
              src={lakbyeLogo}
              alt="LakBye Logo"
              className="auth-standalone-logo-img"
            />
          </Link>
        )}

        <div className="login-form-container">{children}</div>
      </div>
    </div>
  );
}
