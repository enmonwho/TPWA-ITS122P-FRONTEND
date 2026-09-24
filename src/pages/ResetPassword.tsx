import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { authApi } from '../services/api';
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token) {
      setErrorMessage('Missing password reset token.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Reset failed. The link may have expired.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-headings animate-fade-in-up delay-100">
        <h1 className="auth-title">Set new password</h1>
        <p className="auth-subtitle">Enter your new credentials below</p>
      </div>

      {success ? (
        <div className="auth-status-container animate-fade-in-up">
          <div className="auth-status-card auth-status-card--success">
            <div className="auth-status-icon-wrap">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="auth-status-title">Password Updated!</h3>
            <p className="auth-status-desc">Redirecting to login page...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-container">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              required
              className="auth-input"
            />
            <button
              type="button"
              className="password-visibility-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="auth-input-container">
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="auth-input"
            />
          </div>

          {errorMessage && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="auth-submit-container">
            <button type="submit" disabled={submitting} className="auth-submit">
              {submitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>

          <div className="auth-prompt-container">
            <Link to="/login" className="auth-link">
              Back to Log In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
