import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import stampsCollage from '../assets/stamps-collage.png';
import lakbyeLogo from '../assets/lakbye-logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Login submitted:', { email, password });
  };

  return (
    <div className="login-root">
      {/* 
        LAYER 3: Stamps Collage 
        Behaves like object-fit: cover for the transparent stamps image, 
        ensuring absolute percentages perfectly map to the image's natural dimensions (1920x1080)
      */}
      <div className="login-background-layer">
        <div className="login-visual-assets">
          <img src={stampsCollage} alt="Stamps Collage" className="login-stamps" />

          {/* 
            LAYER 4: Logo 
            Overlay the logo absolutely using PERCENTAGE values based on the 1920x1080 coordinate space 
          */}
          <Link to="/" aria-label="Go to homepage" className="login-logo-link">
            <img src={lakbyeLogo} alt="LakBye Logo" className="login-logo-image" />
            <p className="login-tagline">Saan aabot ang Lakbye mo?</p>
          </Link>
        </div>
      </div>

      {/* 
        FOREGROUND SPLIT LAYOUT
        The right side contains the form, cleanly centered. Left side is transparent.
      */}
      <div className="login-interactive-layer">
        {/* Left half - transparent spacer so the stamps show through */}
        <div className="login-left-column"></div>

        {/* Right half - Form overlay */}
        <div className="login-right-column">
          <div className="login-form-container">
            <div className="login-headings">
              <h1 className="login-title">Welcome back</h1>
              <p className="login-subtitle">Log in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="email-input-container">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="email-input"
                />
              </div>

              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="password-input"
                />
                <button
                  type="button"
                  className="password-visibility-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  )}
                </button>
              </div>

              <div className="forgot-password-container">
                <Link to="#" className="forgot-password-link">
                  Forgot password?
                </Link>
              </div>

              <div className="submit-button-container">
                <button type="submit" className="submit-button">
                  Log In
                </button>
              </div>

              <div className="signup-prompt-container">
                <span className="signup-prompt-text">New to Lakbye?</span>
                <Link to="/signup" className="signup-link">
                  Sign Up
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
