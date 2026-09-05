import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import AuthLayout from '../components/AuthLayout';

export default function SignUp() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Signup submitted:', { firstName, lastName, email, password });
  };

  return (
    <AuthLayout>
      <div className="auth-headings animate-fade-in-up delay-100">
        <h1 className="auth-title">Join us today</h1>
        <p className="auth-subtitle">Create your account to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-inputs-row animate-fade-in-up delay-150">
          <div className="auth-input-container">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              required
              className="auth-input"
            />
          </div>
          <div className="auth-input-container">
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
              required
              className="auth-input"
            />
          </div>
        </div>

        <div className="auth-input-container animate-fade-in-up delay-150">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="auth-input"
          />
        </div>

        <div className="auth-input-container animate-fade-in-up delay-150">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="auth-input"
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

        <div className="auth-submit-container animate-fade-in-up delay-150">
          <button type="submit" className="auth-submit">
            Create Account
          </button>
        </div>

        <div className="auth-terms-container animate-fade-in-up delay-200">
          <p className="auth-terms-text">
            By signing up, you agree to Lakbye's{' '}
            <Link to="#" className="auth-terms-link">
              Terms and Conditions
            </Link>{' '}
            &{' '}
            <Link to="#" className="auth-terms-link">
              Privacy Policy
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
