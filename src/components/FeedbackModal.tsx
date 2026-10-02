import React, { useState } from 'react';
import { X, Star, MapPin, Send, CheckCircle2 } from 'lucide-react';
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
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <button
        type="button"
        className="modal-backdrop-dismiss"
        onClick={() => !submitting && onClose()}
        aria-label="Close feedback modal"
      />

      <div
        className="modal-box animate-slide-up"
        style={{
          width: '520px',
          maxWidth: '92vw',
          padding: '28px 32px',
          position: 'relative',
          borderRadius: '24px',
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => !submitting && onClose()}
          disabled={submitting}
          className="modal-close-btn"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="mb-5 text-center">
          <h2 className="modal-title text-xl font-bold text-stone-900 mb-1">
            Give Us Feedback
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Share your experience exploring destinations with LakBye!
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Traveler Name (Read-only / prefilled from user) */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                disabled
                value={reviewerName}
                className="w-full px-3.5 py-2.5 bg-stone-100 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 cursor-not-allowed"
              />
            </div>

            {/* Country / Place Visited (Restricted to Country level) */}
            <div className="relative">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Country / Place Visited <span className="text-amber-600">*</span>
              </label>
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 border border-stone-200 rounded-xl bg-white focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-all cursor-pointer"
                onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
              >
                <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                <input
                  type="text"
                  placeholder="Select country visited..."
                  value={countryName || countrySearch}
                  onChange={(e) => {
                    setCountrySearch(e.target.value);
                    setCountryName('');
                    setIsCountryDropdownOpen(true);
                  }}
                  className="w-full text-xs font-medium text-stone-800 focus:outline-none bg-transparent"
                />
              </div>

              {isCountryDropdownOpen && (
                <div className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-stone-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 py-1">
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
                        className={`w-full text-left px-3.5 py-2 text-xs hover:bg-amber-50 transition-colors ${
                          countryName === c
                            ? 'font-bold text-amber-700 bg-amber-50/60'
                            : 'text-stone-700'
                        }`}
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
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Rating <span className="text-amber-600">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 text-amber-400 hover:scale-110 active:scale-95 transition-transform"
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star
                        size={22}
                        className={
                          filled ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                        }
                      />
                    </button>
                  );
                })}
                <span className="text-xs font-bold text-amber-700 ml-2">
                  {rating} / 5 Stars
                </span>
              </div>
            </div>

            {/* Review Title */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Title <span className="text-amber-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Unforgettable Island Getaway!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>

            {/* Comments */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Comments <span className="text-amber-600">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Tell us about your trip and experience using LakBye..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-full border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-create-trip flex items-center gap-1.5 px-6 py-2 rounded-full text-xs font-bold text-white shadow-md disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #f05a28 0%, #e04a18 100%)',
                }}
              >
                <Send size={13} />
                <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
