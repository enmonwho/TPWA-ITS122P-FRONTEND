import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, AlertCircle, ArrowLeft, ExternalLink, Mail } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { authApi } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [accountFound, setAccountFound] = useState<boolean | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setSuccess(true);
      setAccountFound(res.accountFound ?? null);
      setEmailSent(res.emailSent ?? null);
      if (res?.devResetUrl) {
        setDevResetUrl(res.devResetUrl);
      }
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : 'Failed to dispatch reset instructions. Please try again.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-headings animate-fade-in-up delay-100">
        <h1 className="auth-title">Forgot password?</h1>
        <p className="auth-subtitle">No worries, we'll send you reset instructions</p>
      </div>

      {success ? (
        <div className="auth-status-container animate-fade-in-up">
          {accountFound === false ? (
            <div className="auth-status-card auth-status-card--warning">
              <div className="auth-status-icon-wrap">
                <AlertCircle size={28} />
              </div>
              <h3 className="auth-status-title">No Account Found</h3>
              <p className="auth-status-desc">
                We couldn't find an account matching{' '}
                <span className="auth-status-target">{email}</span>. Please verify your
                email or create a new account.
              </p>
            </div>
          ) : (
            <div className="auth-status-card auth-status-card--success">
              <div className="auth-status-icon-wrap">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="auth-status-title">
                {emailSent ? 'Email Dispatched!' : 'Reset Link Generated'}
              </h3>
              <p className="auth-status-desc">
                {emailSent ? (
                  <>
                    A password reset link was sent to{' '}
                    <span className="auth-status-target">{email}</span>. Please check your
                    inbox and spam folder.
                  </>
                ) : (
                  <>
                    A password reset link was created for{' '}
                    <span className="auth-status-target">{email}</span>.
                  </>
                )}
              </p>
            </div>
          )}

          {devResetUrl && (
            <div className="auth-status-dev-box">
              <span className="auth-status-dev-title">🛠️ Development Mode Helper</span>
              <p className="auth-status-dev-text">
                Since email delivery may be mocked or run in development, you can open the
                reset link directly:
              </p>
              <a href={devResetUrl} className="auth-status-dev-link">
                <span>{devResetUrl}</span>
                <ExternalLink size={12} className="shrink-0" />
              </a>
            </div>
          )}

          <div className="auth-status-actions">
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setDevResetUrl(null);
              }}
              className="auth-status-retry-btn"
            >
              Didn't get an email? Try another address
            </button>
            <Link to="/login" className="auth-status-return-btn">
              <ArrowLeft size={16} /> Return to Log In
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-container animate-fade-in-up delay-150">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Enter your email address"
              required
              className="auth-input"
            />
          </div>

          {errorMessage && (
            <div className="auth-error-banner animate-fade-in-up" role="alert">
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="auth-submit-container animate-fade-in-up delay-150">
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="auth-submit"
            >
              <Mail size={16} />
              {submitting ? 'Sending instructions...' : 'Send Reset Link'}
            </button>
          </div>

          <div className="auth-prompt-container animate-fade-in-up delay-200">
            <Link to="/login" className="auth-link auth-back-link">
              <ArrowLeft size={16} /> Back to Log In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
