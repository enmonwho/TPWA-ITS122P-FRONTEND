import React, { useState, useEffect } from 'react';
import { Users, UserPlus, X, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface Collaborator {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  username: string;
  role: string;
  created_at: string;
}

interface TripCollaboratorModalProps {
  isOpen: boolean;
  tripId: string | number;
  tripTitle?: string;
  isOwner?: boolean;
  onClose: () => void;
}

export function TripCollaboratorModal({
  isOpen,
  tripId,
  tripTitle = 'Trip',
  isOwner = true,
  onClose,
}: TripCollaboratorModalProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(
    null,
  );

  const loadCollaborators = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/trips/${tripId}/collaborators`);
      setCollaborators(res.data.collaborators || []);
    } catch (err) {
      console.error('Failed to load trip companions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tripId) {
      loadCollaborators();
    }
  }, [isOpen, tripId]);

  const handleAddCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) return;

    setAdding(true);
    setFeedback(null);
    try {
      const res = await api.post(`/trips/${tripId}/collaborators`, {
        emailOrUsername: emailOrUsername.trim(),
        role: 'editor',
      });
      setFeedback({ text: res.data.message || 'Companion added!', isError: false });
      setEmailOrUsername('');
      loadCollaborators();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Could not add companion. Please check username or email.';
      setFeedback({ text: msg, isError: true });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCompanion = async (targetUserId: number) => {
    try {
      await api.delete(`/trips/${tripId}/collaborators/${targetUserId}`);
      setCollaborators((prev) => prev.filter((c) => c.user_id !== targetUserId));
      setFeedback({ text: 'Companion removed from trip.', isError: false });
    } catch (err) {
      console.error('Failed to remove companion:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl border border-slate-100 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#2F1B0C]">Trip Companions</h3>
            <p className="text-xs text-slate-500">
              Co-travelers can access, view, and plan <strong>"{tripTitle}"</strong>{' '}
              together.
            </p>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3 my-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.isError
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {!feedback.isError && (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Invite companion input */}
        {isOwner && (
          <form onSubmit={handleAddCompanion} className="mt-4 mb-5">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Invite a Travel Buddy (Email or Username)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="companion@domain.com or @username"
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={adding}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <UserPlus size={15} />
                {adding ? 'Inviting...' : 'Add Buddy'}
              </button>
            </div>
          </form>
        )}

        {/* Companion list */}
        <div className="mt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Active Companions ({collaborators.length})
          </h4>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Loading companions...
              </div>
            ) : collaborators.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                No companions added yet. Share this trip so your friends can plan
                together!
              </div>
            ) : (
              collaborators.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                      {c.full_name ? c.full_name[0].toUpperCase() : 'U'}
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-[#2F1B0C] block truncate">
                        {c.full_name || c.username}
                      </span>
                      <span className="text-slate-400 text-[11px] truncate block">
                        {c.email}
                      </span>
                    </div>
                  </div>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCompanion(c.user_id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove companion"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default TripCollaboratorModal;
