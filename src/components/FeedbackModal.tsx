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
