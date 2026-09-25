import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle } from 'lucide-react';

import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { usePageLoader } from '../context/PageLoaderContext';
import { ROUTES } from '../lib/constants';
import { authApi, preferencesApi } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  // Validate required inputs
  const isFormValid = email.trim() !== '' && password.trim() !== '';

  const { login } = useAuth();
  const { triggerTransition } = usePageLoader();
  const navigate = useNavigate();

  const handleResendAndNavigate = async () => {
    if (!email.trim() || isResending) return;
    setIsResending(true);
    setResendSuccess('');
    try {
      await authApi.resendVerification(email.trim());
      setResendSuccess('Verification code sent! Redirecting...');
      setTimeout(() => {
        navigate(ROUTES.VERIFY_EMAIL, {
          state: { email: email.trim(), justResent: true },
        });
      }, 700);
    } catch (resendErr) {
      console.error('Failed to resend verification:', resendErr);
      navigate(ROUTES.VERIFY_EMAIL, { state: { email: email.trim() } });
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setNeedsVerification(false);
    setResendSuccess('');
    setIsLoading(true);

    try {
      await triggerTransition(async () => {
        const response = await login({ email, password });

        const role = response.user?.role?.toLowerCase();
        if (role === 'admin') {
          navigate(ROUTES.ADMIN);
        } else if (role === 'staff') {
          navigate(ROUTES.STAFF);
        } else {
          // Check if customer has completed onboarding preferences
          const userId = response.user?.id;
          const prefs = await preferencesApi.getPreferences(userId);
          const hasPrefs =
            prefs &&
            (prefs.currency ||
              prefs.timeFormat ||
              prefs.username ||
              prefs.onboardingCompleted);

          if (!hasPrefs) {
            navigate(ROUTES.ONBOARDING);
          } else {
            navigate(ROUTES.DASHBOARD);
          }
        }
      }, 700);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data;
        if (status === 403 && data?.needsVerification) {
          setNeedsVerification(true);
          setErrorMessage(data.message || 'Please verify your email before logging in.');
          return;
        }
        setErrorMessage(data?.message || 'Invalid email or password.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-headings animate-fade-in-up delay-100">
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Log in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-input-container animate-fade-in-up delay-150">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            placeholder="Email address"
            required
            className="auth-input"
          />
        </div>

        <div className="auth-input-container animate-fade-in-up delay-150">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMessage) setErrorMessage('');
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
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                <circle cx="12" cy="12" r="3" />
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
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </button>
        </div>

        <div className="forgot-password-container animate-fade-in-up delay-200">
          <Link to="/forgot-password" className="forgot-password-link">
            Forgot password?
          </Link>
        </div>

        <div className="auth-submit-container animate-fade-in-up delay-150">
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={`auth-submit ${
              !isFormValid || isLoading
                ? 'opacity-50 cursor-not-allowed bg-gray-400!'
                : ''
            }`}
          >
            {isLoading ? 'Logging In...' : 'Log In'}
          </button>
        </div>

        {needsVerification ? (
          <div
            className="w-full mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex flex-col gap-2.5 animate-fade-in-up"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <span className="font-semibold">
                {errorMessage || 'Please verify your email before logging in.'}
              </span>
            </div>
            {resendSuccess && (
              <p className="text-emerald-700 font-medium text-[11px]">{resendSuccess}</p>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
              <button
                type="button"
                disabled={isResending}
                onClick={handleResendAndNavigate}
                className="text-xs font-bold text-[#f05a28] hover:underline cursor-pointer disabled:opacity-50"
              >
                {isResending ? 'Sending code...' : 'Resend verification code →'}
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(ROUTES.VERIFY_EMAIL, { state: { email: email.trim() } })
                }
                className="text-[11px] text-stone-600 hover:text-stone-900 underline cursor-pointer"
              >
                Enter code
              </button>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="auth-error-banner animate-fade-in-up" role="alert">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <div className="auth-prompt-container animate-fade-in-up delay-200">
          <span className="auth-prompt-text">New to Lakbye?</span>
          <Link to="/signup" className="auth-link">
            Sign Up
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
