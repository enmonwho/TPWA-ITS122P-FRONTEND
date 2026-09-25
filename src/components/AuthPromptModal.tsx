import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Lock, ArrowRight, UserPlus } from 'lucide-react';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export default function AuthPromptModal({
  isOpen,
  onClose,
  featureName = 'this feature',
}: AuthPromptModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay auth-prompt-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-prompt-title"
    >
      <button
        type="button"
        className="modal-backdrop-dismiss"
        aria-label="Close modal backdrop"
        onClick={onClose}
      />

      <div className="auth-prompt-modal-container animate-fade-in-up">
        <button
          type="button"
          onClick={onClose}
          className="auth-prompt-close-btn"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        <div className="auth-prompt-icon-wrap">
          <Lock size={26} />
        </div>

        <h3 id="auth-prompt-title" className="auth-prompt-title">
          Sign In to Access {featureName}
        </h3>

        <p className="auth-prompt-subtitle">
          Please log in or create a LakBye account to manage your trips, track expenses,
          and explore curated itineraries.
        </p>

        <div className="auth-prompt-actions">
          <Link to="/login" className="auth-prompt-btn-signin" onClick={onClose}>
            <span>Sign In</span>
            <ArrowRight size={16} />
          </Link>

          <Link to="/signup" className="auth-prompt-btn-signup" onClick={onClose}>
            <UserPlus size={16} />
            <span>Create Account</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
