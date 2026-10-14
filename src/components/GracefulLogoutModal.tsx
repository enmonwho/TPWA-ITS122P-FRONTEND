import { Compass, CheckCircle2 } from 'lucide-react';

interface GracefulLogoutModalProps {
  isOpen: boolean;
}

export function GracefulLogoutModal({ isOpen }: GracefulLogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm rounded-3xl bg-white/95 p-8 shadow-2xl border border-orange-100 text-center flex flex-col items-center transform animate-in zoom-in-95 duration-300">
        <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-orange-100 to-amber-50 shadow-inner">
          <Compass
            className="h-10 w-10 text-[#f05a28] animate-spin"
            style={{ animationDuration: '4s' }}
          />
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-white shadow">
            <CheckCircle2 size={16} />
          </div>
        </div>

        <h3 className="text-2xl font-black text-[#2F1B0C] tracking-tight">
          Safe Travels!
        </h3>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-xs">
          Logging you out safely... Thank you for exploring and planning with{' '}
          <strong>LakBye</strong>!
        </p>

        <div className="mt-6 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f05a28] animate-ping" />
          <span className="text-xs font-semibold text-slate-400">
            See you on your next journey
          </span>
        </div>
      </div>
    </div>
  );
}
