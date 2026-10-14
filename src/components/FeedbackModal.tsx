import React, { useState, useRef, useEffect } from 'react';
import { X, Star, MapPin, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { feedbackApi, type FeedbackItem } from '../services/api';
import { COUNTRIES } from '../constants/countries';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFeedbackSubmitted?: (feedback: FeedbackItem) => void;
}

export default function FeedbackModal({
  isOpen,
  onClose,
  onFeedbackSubmitted,
}: FeedbackModalProps) {
  const { user } = useAuth();

  const [countryName, setCountryName] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useModalBehavior(isOpen, onClose, submitting);

  useEffect(() => {
    if (!isCountryDropdownOpen) return;

    const checkPosition = () => {
      if (!inputWrapperRef.current) return;
      const rect = inputWrapperRef.current.getBoundingClientRect();
      const modalShell = inputWrapperRef.current.closest('.feedback-shell');
      const dropdownHeight = 180;
      const gap = 4;

      if (modalShell) {
        const shellRect = modalShell.getBoundingClientRect();
        const spaceBelow = shellRect.bottom - rect.bottom;
        const spaceAbove = rect.top - shellRect.top;
        if (spaceBelow < dropdownHeight + gap && spaceAbove > spaceBelow) {
          setOpenUpward(true);
          return;
        }
      } else {
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < dropdownHeight + gap && spaceAbove > spaceBelow) {
          setOpenUpward(true);
          return;
        }
      }
      setOpenUpward(false);
    };

    checkPosition();
    window.addEventListener('resize', checkPosition);
    return () => window.removeEventListener('resize', checkPosition);
  }, [isCountryDropdownOpen]);

  useEffect(() => {
    if (!isCountryDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(target)
      ) {
        setIsCountryDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsCountryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isCountryDropdownOpen]);

  if (!isOpen) return null;

  const filteredCountries = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!countryName) {
      setError('Please select a country you visited.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a title for your feedback.');
      return;
    }
    if (!comment.trim()) {
      setError('Please share your thoughts or travel story.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setError('Rating must be between 1 and 5 stars.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await feedbackApi.submit({
        country_name: countryName,
        title: title.trim(),
        comment: comment.trim(),
        rating,
      });

      setSuccess(true);
      if (onFeedbackSubmitted && res.feedback) {
        onFeedbackSubmitted(res.feedback);
      }

      setTimeout(() => {
        setSuccess(false);
        setCountryName('');
        setCountrySearch('');
        setTitle('');
        setComment('');
        setRating(5);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to submit feedback. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const reviewerName = user?.full_name || user?.username || 'Traveler';

  return (
    <div className="feedback-overlay" role="dialog" aria-modal="true">
      <button
        type="button"
        className="feedback-backdrop-dismiss"
        onClick={() => !submitting && onClose()}
        aria-label="Close feedback modal"
      />

      <div className="feedback-shell animate-slide-up">
        <button
          type="button"
          onClick={() => !submitting && onClose()}
          disabled={submitting}
          className="feedback-close"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        <div className="mb-4 text-center relative z-[2]">
          <h2
            style={{
              margin: '4px 28px 2px',
              textAlign: 'center',
              fontSize: '26px',
              lineHeight: 1.2,
              fontWeight: 700,
              fontFamily: "'Poppins', sans-serif",
              color: '#2F1B0C',
              opacity: 1,
            }}
          >
            <span className="feedback-heading-plain">Give Us </span>
            <span
              className="feedback-heading-gradient"
              style={{ filter: "url('#text-inner-shadow')" }}
            >
              Feedback
            </span>
          </h2>
          <p
            style={{
              margin: '0 auto 16px',
              maxWidth: '320px',
              textAlign: 'center',
              color: 'rgba(72,42,19,.78)',
              fontSize: '13px',
              lineHeight: 1.55,
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Share your travel experience with LakBye.
          </p>
        </div>

        {success ? (
          <div className="py-8 text-center animate-fade-in">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3 animate-bounce" />
            <h3 className="text-base font-bold text-stone-900 mb-1">
              Thank You for Your Feedback!
            </h3>
            <p className="text-xs text-stone-500">
              Your story has been received and added to LakBye traveler reviews.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            {error && (
              <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Traveler Name (Read-only / prefilled from user) */}
            <div className="feedback-field">
              <label htmlFor="feedback-user-name">Your Name</label>
              <input
                id="feedback-user-name"
                type="text"
                maxLength={50}
                disabled
                value={reviewerName}
                style={{
                  opacity: 0.85,
                  cursor: 'not-allowed',
                  backgroundColor: 'rgba(255,255,255,0.5)',
                }}
              />
            </div>

            {/* Country / Place Visited (Restricted to Country level) */}
            <div
              className={`feedback-field feedback-country-field ${isCountryDropdownOpen ? 'dropdown-open' : ''}`}
            >
              <label htmlFor="feedback-country-input">
                Country / Place Visited <span className="req">*</span>
              </label>
              <div
                ref={inputWrapperRef}
                className="feedback-country-input-wrapper"
                role="combobox"
                aria-expanded={isCountryDropdownOpen}
                aria-controls="feedback-country-dropdown-list"
                aria-haspopup="listbox"
                tabIndex={-1}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'Enter') {
                    setIsCountryDropdownOpen(true);
                  }
                }}
                onClick={() => {
                  setIsCountryDropdownOpen((prev) => !prev);
                  inputRef.current?.focus();
                }}
              >
                <MapPin className="w-4 h-4 text-[#E9724C] shrink-0" />
                <input
                  ref={inputRef}
                  id="feedback-country-input"
                  type="text"
                  maxLength={100}
                  placeholder="Select country visited..."
                  value={countryName || countrySearch}
                  autoComplete="off"
                  onClick={(e) => e.stopPropagation()}
                  onFocus={() => setIsCountryDropdownOpen(true)}
                  onChange={(e) => {
                    setCountrySearch(e.target.value);
                    setCountryName('');
                    setIsCountryDropdownOpen(true);
                  }}
                />
              </div>

              {isCountryDropdownOpen && (
                <div
                  ref={dropdownRef}
                  id="feedback-country-dropdown-list"
                  className={`feedback-country-dropdown ${openUpward ? 'open-upward' : 'open-downward'}`}
                  role="listbox"
                  aria-label="Country list"
                >
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="option"
                        aria-selected={countryName === c}
                        onClick={() => {
                          setCountryName(c);
                          setCountrySearch('');
                          setIsCountryDropdownOpen(false);
                        }}
                        className={`feedback-country-option ${
                          countryName === c ? 'selected' : ''
                        }`}
                      >
                        {c}
                      </button>
                    ))
                  ) : (
                    <div className="feedback-country-empty">
                      No matching countries found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rating Stars */}
            <div className="feedback-field">
              <span className="text-[12px] font-bold text-[rgba(72,42,19,0.88)]">
                Rating <span className="req">*</span>
              </span>
              <div className="feedback-stars">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5 cursor-pointer bg-transparent border-none transition-transform hover:scale-110 active:scale-95 text-[#FFC245]"
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star
                        size={24}
                        className={
                          filled ? 'fill-[#FFC245] text-[#FFC245]' : 'text-stone-300'
                        }
                      />
                    </button>
                  );
                })}
                <span className="rating-copy">{rating} / 5 Stars</span>
              </div>
            </div>

            {/* Review Title */}
            <div className="feedback-field">
              <label htmlFor="feedback-title-input">
                Title <span className="req">*</span>
              </label>
              <input
                id="feedback-title-input"
                type="text"
                maxLength={100}
                required
                placeholder="Summarize your experience"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Comments */}
            <div className="feedback-field">
              <label htmlFor="feedback-comment-input">
                Comments <span className="req">*</span>
              </label>
              <textarea
                id="feedback-comment-input"
                required
                rows={3}
                placeholder="Tell us about your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {/* Social Media Links (#21) */}
            <div className="pt-2 border-t border-stone-200">
              <span className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Connect with our travel community:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="https://facebook.com/lakbye"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </a>
                <a
                  href="https://instagram.com/lakbye"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-pink-50 text-pink-700 hover:bg-pink-100 text-xs font-medium transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  Instagram
                </a>
                <a
                  href="https://twitter.com/lakbye"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-medium transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X / Twitter
                </a>
                <a
                  href="https://youtube.com/@lakbye"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  YouTube
                </a>
              </div>
            </div>

            {/* Actions */}
            <div className="feedback-actions">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="feedback-btn secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="feedback-btn primary"
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
