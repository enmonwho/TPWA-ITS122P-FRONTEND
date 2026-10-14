import { Clock, ShieldAlert, LogOut } from 'lucide-react';

interface IdleTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export function IdleTimeoutModal({
  isOpen,
  remainingSeconds,
  onStayLoggedIn,
  onLogout,
}: IdleTimeoutModalProps) {
  if (!isOpen) return null;

  const percentage = Math.max(0, Math.min(100, (remainingSeconds / 60) * 100));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-amber-200 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200 shadow-inner">
          <ShieldAlert className="h-8 w-8 animate-pulse text-amber-600" />
        </div>

        <h3 className="text-xl font-extrabold text-[#2F1B0C]">
          Still Exploring with LakBye?
        </h3>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          For your account security, your session will automatically close due to
          inactivity in:
        </p>

        {/* Countdown display */}
        <div className="my-5 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 text-3xl font-black text-amber-600 font-mono">
            <Clock
              size={28}
              className="animate-spin text-amber-500"
              style={{ animationDuration: '3s' }}
            />
            <span>{remainingSeconds}s</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden border border-slate-200">
            <div
              className="h-full bg-amber-500 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          Click <strong>Stay Logged In</strong> to continue planning your trip without
          losing your progress.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={16} />
            Log Out Now
          </button>

          <button
            type="button"
            onClick={onStayLoggedIn}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#f05a28] to-[#e04816] text-white font-bold text-sm shadow-md hover:shadow-lg hover:brightness-105 transition-all cursor-pointer"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
