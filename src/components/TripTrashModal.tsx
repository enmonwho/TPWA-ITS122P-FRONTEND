import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Calendar, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface TrashTrip {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  deleted_at: string;
  cover_photo?: string;
}

interface TripTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripRestored: () => void;
}

export function TripTrashModal({ isOpen, onClose, onTripRestored }: TripTrashModalProps) {
  const [trashTrips, setTrashTrips] = useState<TrashTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  const loadTrash = async () => {
    setLoading(true);
    try {
      const res = await api.get('/trips?trash=true');
      setTrashTrips(res.data.trips || []);
    } catch (err) {
      console.error('Failed to load trash trips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTrash();
    }
  }, [isOpen]);

  const handleRestore = async (id: number, title: string) => {
    setRestoringId(id);
    try {
      await api.post(`/trips/${id}/restore`);
      setFeedback(`"${title}" has been restored to your active trips!`);
      setTrashTrips((prev) => prev.filter((t) => t.id !== id));
      onTripRestored();
      setTimeout(() => setFeedback(''), 3000);
    } catch (err) {
      console.error('Failed to restore trip:', err);
    } finally {
      setRestoringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-white p-7 shadow-2xl border border-slate-100 relative max-h-[85vh] flex flex-col">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
            <Trash2 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#2F1B0C]">
              Recently Deleted Trips (Trash)
            </h3>
            <p className="text-xs text-slate-500">
              Deleted trips are preserved for 30 days before permanent removal.
            </p>
          </div>
        </div>

        {feedback && (
          <div className="p-3 mb-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading deleted trips...
            </div>
          ) : trashTrips.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                <Trash2 size={22} />
              </div>
              <p className="text-sm font-bold text-slate-600">Your Trash is empty</p>
              <p className="text-xs text-slate-400 mt-1">
                No trips have been deleted recently.
              </p>
            </div>
          ) : (
            trashTrips.map((trip) => {
              const deletedDate = trip.deleted_at
                ? new Date(trip.deleted_at).toLocaleDateString()
                : 'Recently';

              return (
                <div
                  key={trip.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white flex items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                      {trip.cover_photo ? (
                        <img
                          src={trip.cover_photo}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Calendar size={18} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#2F1B0C] truncate">
                        {trip.title}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <AlertCircle size={12} className="text-amber-500" />
                        Deleted {deletedDate} • Auto-purged in 30 days
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRestore(trip.id, trip.title)}
                    disabled={restoringId === trip.id}
                    className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    {restoringId === trip.id ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TripTrashModal;
