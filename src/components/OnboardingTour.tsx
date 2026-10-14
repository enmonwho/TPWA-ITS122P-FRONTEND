import { useState } from 'react';
import {
  Compass,
  MapPin,
  Calendar,
  Wallet,
  Users,
  ChevronRight,
  Check,
} from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function OnboardingTour({ isOpen, onClose, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to LakBye!',
      subtitle: 'Your Smart All-in-One Travel Planner',
      icon: <Compass className="w-10 h-10 text-[#f05a28]" />,
      description:
        'Plan unforgettable vacations effortlessly. LakBye helps you map destinations, coordinate multi-day schedules, track budgets in local currencies, and collaborate with co-travelers.',
      badge: 'Step 1 of 5',
    },
    {
      title: 'Create Your Itinerary',
      subtitle: 'Pick countries and customize travel dates',
      icon: <MapPin className="w-10 h-10 text-amber-500" />,
      description:
        'Start by clicking "+ Create Trip" on your dashboard. Choose destination countries (like Japan, South Korea, or the Philippines), set duration, and your route will be automatically initialized.',
      badge: 'Step 2 of 5',
    },
    {
      title: 'Route Planner & Live Map',
      subtitle: 'Organize cities and view interactive routes',
      icon: <Calendar className="w-10 h-10 text-sky-500" />,
      description:
        'In the Route Planner workspace, add popular cities or custom places, adjust duration in days, and preview your travel pins plotted across the Leaflet interactive map.',
      badge: 'Step 3 of 5',
    },
    {
      title: 'Smart Multi-Currency Budgeting',
      subtitle: 'Auto-convert expenses between local currencies',
      icon: <Wallet className="w-10 h-10 text-emerald-500" />,
      description:
        'Set your master trip budget in your preferred currency (PHP, JPY, USD, KRW). When adding expenses abroad, LakBye shows instant local currency conversion estimates.',
      badge: 'Step 4 of 5',
    },
    {
      title: 'Travel Together & Safe Backups',
      subtitle: 'Invite companions and restore deleted trips',
      icon: <Users className="w-10 h-10 text-indigo-500" />,
      description:
        'Click "+ Companion" to share your itinerary with travel buddies. Plus, any deleted trip is stored safely in your Trash bin for 30 days so you never lose your hard work!',
      badge: 'Step 5 of 5',
    },
  ];

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      if (onComplete) onComplete();
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl border border-orange-100 relative">
        <div className="flex justify-between items-center mb-5">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-orange-50 text-[#f05a28] rounded-full border border-orange-100">
            {step.badge}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            Skip Tutorial
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
            {step.icon}
          </div>
          <div>
            <h3 className="text-xl font-black text-[#2F1B0C] leading-snug">
              {step.title}
            </h3>
            <p className="text-xs font-medium text-slate-500">{step.subtitle}</p>
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 my-4">
          <p className="text-sm text-slate-700 leading-relaxed">{step.description}</p>
        </div>

        {/* Step indicators */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-5">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'w-6 bg-[#f05a28]'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f05a28] to-[#e04816] text-white text-xs font-bold shadow-md hover:shadow-lg hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isLast ? (
                <>
                  <Check size={14} /> Got It! Start Planning
                </>
              ) : (
                <>
                  Next <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
