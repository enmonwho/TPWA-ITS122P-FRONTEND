import React, { useState } from 'react';
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
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useModalBehavior(isOpen, onClose, submitting);

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

        <div className="mb-4 text-center">
          <h2
            style={{
              margin: '4px 28px 2px',
              textAlign: 'center',
              fontSize: '26px',
              lineHeight: 1.2,
              fontWeight: 700,
            }}
          >
            <span className="feedback-heading-plain">Give Us </span>
            <span className="feedback-heading-gradient">Feedback</span>
          </h2>
          <p
            style={{
              margin: '0 auto 16px',
              maxWidth: '320px',
              textAlign: 'center',
              color: 'rgba(72,42,19,.78)',
              fontSize: '13px',
              lineHeight: 1.55,
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
            <div className="feedback-field relative">
              <label htmlFor="feedback-country-input">
                Country / Place Visited <span className="req">*</span>
              </label>
              <div
                className="flex items-center gap-2 cursor-pointer"
                style={{
                  width: '100%',
                  borderRadius: '14px',
                  border: '1px solid rgba(72,42,19,.14)',
                  background: 'rgba(255,255,255,.78)',
                  padding: '11px 14px',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
                }}
                onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
              >
                <MapPin className="w-4 h-4 text-[#E9724C] shrink-0" />
                <input
                  id="feedback-country-input"
                  type="text"
                  placeholder="Select country visited..."
                  value={countryName || countrySearch}
                  onChange={(e) => {
                    setCountrySearch(e.target.value);
                    setCountryName('');
                    setIsCountryDropdownOpen(true);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    margin: 0,
                    boxShadow: 'none',
                    fontSize: '13px',
                    color: '#2F1B0C',
                    width: '100%',
                    outline: 'none',
                  }}
                />
              </div>

              {isCountryDropdownOpen && (
                <div
                  className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-[rgba(72,42,19,0.18)] rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 py-1"
                  style={{ zIndex: 100 }}
                >
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setCountryName(c);
                          setCountrySearch('');
                          setIsCountryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer ${
                          countryName === c
                            ? 'font-bold text-[#E9724C] bg-[#FFF8F3]'
                            : 'text-[#2F1B0C] hover:bg-stone-50'
                        }`}
                        style={{
                          border: 'none',
                          background: countryName === c ? '#FFF8F3' : 'transparent',
                        }}
                      >
                        {c}
                      </button>
                    ))
                  ) : (
                    <div className="px-3.5 py-2 text-xs text-stone-400">
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
