import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { usePageLoader } from '../context/PageLoaderContext';
import { ROUTES } from '../lib/constants';

export default function SignUp() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const isFormValid =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    password.trim() !== '';

  const { register } = useAuth();
  const { triggerTransition } = usePageLoader();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName) {
      setGeneralError('Please enter your first and last name.');
      return;
    }

    setIsLoading(true);

    try {
      await triggerTransition(async () => {
        await register({
          full_name: fullName,
          email,
          password,
        });
        navigate(ROUTES.VERIFY_EMAIL, { state: { email } });
      }, 700);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const msg =
          err.response?.data?.message || 'Registration failed. Please try again.';

        if (status === 409) {
          setEmailError('Email is already registered.');
        } else if (status === 400 && msg.toLowerCase().includes('password')) {
          setPasswordError(msg);
        } else if (status === 400 && msg.toLowerCase().includes('email')) {
          setEmailError(msg);
        } else {
          setGeneralError(msg);
        }
      } else if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
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
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            placeholder="Email address"
            required
            className="auth-input"
          />
        </div>
        {emailError && (
          <p className="auth-field-error animate-fade-in-up" role="alert">
            {emailError}
          </p>
        )}

        <div className="auth-input-container animate-fade-in-up delay-150">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
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
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
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
        {passwordError && (
          <p className="auth-field-error animate-fade-in-up" role="alert">
            {passwordError}
          </p>
        )}

        <div className="auth-submit-container animate-fade-in-up delay-150">
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={`auth-submit ${!isFormValid || isLoading ? 'opacity-50 cursor-not-allowed bg-gray-400!' : ''}`}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>

        {generalError && (
          <div className="auth-error-banner animate-fade-in-up" role="alert">
            {generalError}
          </div>
        )}

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
