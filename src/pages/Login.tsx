import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { usePageLoader } from '../context/PageLoaderContext';
import { ROUTES } from '../lib/constants';
import { authApi } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotStatusMsg, setForgotStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Validate required inputs
  const isFormValid = email.trim() !== '' && password.trim() !== '';

  const { login } = useAuth();
  const { triggerTransition } = usePageLoader();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
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
          navigate(ROUTES.HOME);
        }
      }, 700);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotSending(true);
    setForgotStatusMsg(null);

    try {
      const res = await authApi.forgotPassword(forgotEmail.trim());
      setForgotStatusMsg({
        type: 'success',
        text: res.devResetUrl
          ? 'Reset instructions dispatched! (Check backend terminal for dev URL)'
          : 'If an account exists, a reset link has been dispatched to your email.',
      });
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data?.message
        ? err.response.data.message
        : 'Failed to dispatch reset instructions. Please try again.';
      setForgotStatusMsg({ type: 'error', text: msg });
    } finally {
      setForgotSending(false);
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </button>
        </div>

        <div className="forgot-password-container animate-fade-in-up delay-200">
          <button
            type="button"
            onClick={() => {
              setForgotEmail(email);
              setForgotStatusMsg(null);
              setIsForgotModalOpen(true);
            }}
            className="forgot-password-link bg-transparent border-none p-0 cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        <div className="auth-submit-container animate-fade-in-up delay-150">
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={`auth-submit ${
              !isFormValid || isLoading ? 'opacity-50 cursor-not-allowed !bg-gray-400' : ''
            }`}
          >
            {isLoading ? 'Logging In...' : 'Log In'}
          </button>
        </div>

        {errorMessage && (
          <div className="auth-error-banner animate-fade-in-up" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="auth-prompt-container animate-fade-in-up delay-200">
          <span className="auth-prompt-text">New to Lakbye?</span>
          <Link to="/signup" className="auth-link">
            Sign Up
          </Link>
        </div>
      </form>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
        >
          <button
            type="button"
            className="modal-backdrop-dismiss"
            onClick={() => setIsForgotModalOpen(false)}
            aria-label="Close modal backdrop"
          />
          <div className="start-trip-modal-card" style={{ maxWidth: '420px', zIndex: 10 }}>
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(false)}
              className="modal-close-btn"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <h2 id="forgot-modal-title" className="text-xl font-bold text-stone-900 mb-1">
              Reset Password
            </h2>
            <p className="text-xs text-stone-500 mb-4">
              Enter your registered email address and we'll dispatch a link to reset your account password.
            </p>

            {forgotStatusMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 mb-4 ${
                  forgotStatusMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {forgotStatusMsg.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                )}
                <span>{forgotStatusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
              <div>
                <label htmlFor="forgot-email" className="modal-label">
                  Email Address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  placeholder="yourname@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="modal-input-gradient"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-full transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotSending}
                  className="btn-start-planning-modal text-xs py-2 px-5"
                >
                  {forgotSending ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}