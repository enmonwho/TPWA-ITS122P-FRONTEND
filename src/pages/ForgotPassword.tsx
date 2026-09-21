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
        <div className="animate-fade-in-up flex flex-col gap-4 text-center">
          {accountFound === false ? (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertCircle size={28} />
              </div>
              <h3 className="font-bold text-lg text-amber-950">No Account Found</h3>
              <p className="text-sm text-amber-800 leading-relaxed max-w-sm">
                We couldn't find an account matching{' '}
                <span className="font-semibold text-amber-950">{email}</span>. Please
                verify your email or create a new account.
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="font-bold text-lg text-emerald-950">
                {emailSent ? 'Email Dispatched!' : 'Reset Link Generated'}
              </h3>
              <p className="text-sm text-emerald-800 leading-relaxed max-w-sm">
                {emailSent ? (
                  <>
                    A password reset link was sent to{' '}
                    <span className="font-semibold text-emerald-950">{email}</span>.
                    Please check your inbox and spam folder.
                  </>
                ) : (
                  <>
                    A password reset link was created for{' '}
                    <span className="font-semibold text-emerald-950">{email}</span>.
                  </>
                )}
              </p>
            </div>
          )}

          {devResetUrl && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 flex flex-col gap-2">
              <span className="font-semibold text-amber-950 flex items-center gap-1">
                🛠️ Development Mode Helper
              </span>
              <p className="text-amber-800">
                Since email delivery may be mocked or run in development, you can open the
                reset link directly:
              </p>
              <a
                href={devResetUrl}
                className="font-mono text-[11px] text-teal-700 bg-white p-2 rounded border border-amber-200 break-all hover:underline flex items-center gap-1"
              >
                <span>{devResetUrl}</span>
                <ExternalLink size={12} className="shrink-0" />
              </a>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setDevResetUrl(null);
              }}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 transition underline cursor-pointer"
            >
              Didn't get an email? Try another address
            </button>
            <Link
              to="/login"
              className="auth-submit text-center flex items-center justify-center gap-2 mt-2"
            >
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
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="auth-submit-container animate-fade-in-up delay-150">
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className={`auth-submit flex items-center justify-center gap-2 ${
                submitting || !email.trim()
                  ? 'opacity-50 cursor-not-allowed bg-gray-400!'
                  : ''
              }`}
            >
              <Mail size={16} />
              {submitting ? 'Sending instructions...' : 'Send Reset Link'}
            </button>
          </div>

          <div className="auth-prompt-container animate-fade-in-up delay-200">
            <Link
              to="/login"
              className="auth-link flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={16} /> Back to Log In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
