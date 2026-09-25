import { useState, useRef, useEffect } from 'react';
import type { FormEvent, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Mail, ArrowRight } from 'lucide-react';

import AuthLayout from '../components/AuthLayout';
import { usePageLoader } from '../context/PageLoaderContext';
import { ROUTES } from '../lib/constants';
import { authApi } from '../services/api';

export default function VerifyEmail() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { triggerTransition } = usePageLoader();

  // Extract email from navigation state or URL query param
  const locationState = location.state as { email?: string; justResent?: boolean } | null;
  const email = (locationState?.email || searchParams.get('email') || '').trim();

  // 6 individual OTP digit boxes
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendStatus, setResendStatus] = useState<string | null>(
    locationState?.justResent ? 'Verification code sent to your email!' : null,
  );
  const [isResending, setIsResending] = useState(false);
  // Cooldown in seconds (60 seconds to match backend rate limit)
  const [cooldown, setCooldown] = useState<number>(locationState?.justResent ? 60 : 0);

  // Redirect to signup if user lands directly without an email
  useEffect(() => {
    if (!email) {
      navigate(ROUTES.SIGN_UP, { replace: true });
    }
  }, [email, navigate]);

  // Focus the first input box on initial mount
  useEffect(() => {
    if (email && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [email]);

  // Resend cooldown countdown interval
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const fullOtp = digits.join('');
  const isFormComplete = fullOtp.length === 6 && /^\d{6}$/.test(fullOtp);

  // Handle single digit input
  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (errorMessage) setErrorMessage('');

    // If typing digits
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    const nextDigits = [...digits];
    // Take the last character typed
    nextDigits[index] = cleaned[cleaned.length - 1];
    setDigits(nextDigits);

    // Auto-advance focus to next box
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace and arrow navigation
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move back to previous box and clear it
        const nextDigits = [...digits];
        nextDigits[index - 1] = '';
        setDigits(nextDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const nextDigits = [...digits];
        nextDigits[index] = '';
        setDigits(nextDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle pasting full 6-digit code
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pasted) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasted[i] || '';
    }
    setDigits(nextDigits);
    if (errorMessage) setErrorMessage('');

    // Focus the box following the last pasted digit
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  // Submit OTP Verification
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormComplete || isLoading) return;

    setErrorMessage('');
    setIsLoading(true);

    try {
      await authApi.verifyEmail({
        email,
        otp: fullOtp,
      });

      await triggerTransition(async () => {
        navigate(ROUTES.ONBOARDING, { replace: true });
      }, 700);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          err.response?.data?.message || 'Invalid or expired code. Please try again.';
        setErrorMessage(msg);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Verification failed. Please try again.');
      }
      // Note: As specified, do NOT clear the input so user can inspect and fix any mistyped digit.
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Verification Code
  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage('');
    setResendStatus(null);

    try {
      await authApi.resendVerification(email);
      setCooldown(60);
      setResendStatus('A fresh verification code has been dispatched to your email.');
      // Focus first digit box
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 429) {
          setCooldown(60);
          setErrorMessage(
            'Please wait at least 60 seconds before requesting another code.',
          );
        } else {
          setErrorMessage(
            err.response?.data?.message || 'Failed to resend code. Please try again.',
          );
        }
      } else {
        setErrorMessage('Failed to resend code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <AuthLayout>
      <div className="auth-headings animate-fade-in-up delay-100">
        <h1 className="auth-title">Verify your email</h1>
        <p className="auth-subtitle">Enter the 6-digit code sent to</p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/80 rounded-full mt-2 text-stone-800 text-xs font-semibold">
          <Mail size={13} className="text-[#f05a28]" />
          <span className="truncate max-w-[220px]">{email}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="otp-inputs-row animate-fade-in-up delay-150">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              value={digit}
              onChange={(e) => handleChange(idx, e)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className={`otp-box ${digit ? 'has-value' : ''} ${errorMessage ? 'has-error' : ''}`}
              aria-label={`Digit ${idx + 1}`}
            />
          ))}
        </div>

        {/* Inline Error Message */}
        {errorMessage && (
          <div className="auth-error-banner animate-fade-in-up" role="alert">
            <AlertCircle size={15} className="shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Resend Confirmation Message */}
        {resendStatus && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-center gap-2 animate-fade-in-up">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>{resendStatus}</span>
          </div>
        )}

        {/* Submit Verification Button */}
        <div className="auth-submit-container animate-fade-in-up delay-150">
          <button
            type="submit"
            disabled={!isFormComplete || isLoading}
            className={`auth-submit w-full ${
              !isFormComplete || isLoading
                ? 'opacity-50 cursor-not-allowed bg-gray-400!'
                : ''
            }`}
          >
            {isLoading ? 'Verifying...' : 'Verify Email'}
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </div>

        {/* Resend Code Section */}
        <div className="flex flex-col items-center gap-2 mt-3 animate-fade-in-up delay-200 text-center">
          <p className="text-xs text-stone-500">
            Didn't receive the email? Check your spam folder or
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className="text-xs font-bold text-[#f05a28] hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isResending
              ? 'Sending code...'
              : cooldown > 0
                ? `Resend code (${cooldown}s)`
                : 'Resend code'}
          </button>
        </div>

        {/* Alternative Links */}
        <div className="auth-prompt-container animate-fade-in-up delay-200 border-t border-stone-200/60 pt-3 mt-4">
          <span className="auth-prompt-text text-xs">Wrong email?</span>
          <Link to={ROUTES.SIGN_UP} className="auth-link text-xs">
            Change email
          </Link>
          <span className="text-stone-300 text-xs">•</span>
          <Link to={ROUTES.LOGIN} className="auth-link text-xs">
            Back to Log In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
