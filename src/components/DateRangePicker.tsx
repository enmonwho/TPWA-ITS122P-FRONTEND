import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  errorStart?: boolean;
  errorEnd?: boolean;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  errorStart,
  errorEnd,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // State machine: 0 = pick start, 1 = pick end
  const [step, setStep] = useState<0 | 1>(0);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Base month view (defaults to start date or today)
  const [viewDate, setViewDate] = useState(() => {
    return startDate ? new Date(startDate) : new Date();
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const generateMonthGrid = (year: number, month: number) => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const startDay = start.getDay() === 0 ? 6 : start.getDay() - 1; // Mon = 0

    const days: (string | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= end.getDate(); i++) {
      const d = new Date(year, month, i);
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push(str);
    }
    return days;
  };

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const isDateDisabled = (dateStr: string): boolean => {
    // Block historical dates before today
    if (dateStr < todayStr) return true;
    // When picking End Date, block dates on or before startDate so start and end have different selections
    if (step === 1 && startDate && dateStr <= startDate) return true;
    return false;
  };

  const handleDayClick = (dateStr: string) => {
    if (isDateDisabled(dateStr)) return;

    if (step === 0) {
      onStartDateChange(dateStr);
      // If an end date was already selected and is on or before new start date, reset it
      if (endDate && endDate <= dateStr) {
        onEndDateChange('');
      }
      setStep(1);
    } else {
      if (startDate && dateStr <= startDate) {
        // Enforce constraint: end date must be different and strictly after start date
        return;
      }
      onEndDateChange(dateStr);
      setStep(0);
      setIsOpen(false);
    }
  };

  const handleMouseEnter = (dateStr: string) => {
    if (step === 1 && startDate && dateStr > startDate) {
      setHoverDate(dateStr);
    }
  };

  const isSelected = (dateStr: string) => dateStr === startDate || dateStr === endDate;
  const isHoverRange = (dateStr: string) => {
    if (step !== 1 || !startDate || !hoverDate) return false;
    return dateStr > startDate && dateStr <= hoverDate;
  };
  const isActualRange = (dateStr: string) => {
    if (!startDate || !endDate) return false;
    return dateStr > startDate && dateStr < endDate;
  };

  const shiftMonth = (offset: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthGrid = generateMonthGrid(year, month);

  return (
    <div className="relative" ref={popoverRef}>
      <div className="flex items-center gap-3">
        <div
          className="input-gradient-border relative flex-1 flex items-center gap-2.5"
          style={{ borderColor: errorStart ? 'red' : undefined }}
        >
          <Calendar className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
          <input
            type="text"
            readOnly
            className="modal-input cursor-pointer"
            placeholder="Start Date"
            value={startDate}
            onClick={() => {
              setIsOpen(true);
              setStep(0);
              if (startDate) {
                setViewDate(new Date(startDate));
              }
            }}
          />
        </div>
        <span className="text-slate-500 font-medium text-sm">to</span>
        <div
          className="input-gradient-border relative flex-1 flex items-center gap-2.5"
          style={{ borderColor: errorEnd ? 'red' : undefined }}
        >
          <Calendar className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
          <input
            type="text"
            readOnly
            className="modal-input cursor-pointer"
            placeholder="End Date"
            value={endDate}
            onClick={() => {
              setIsOpen(true);
              setStep(1);
              if (endDate) {
                setViewDate(new Date(endDate));
              } else if (startDate) {
                setViewDate(new Date(startDate));
              }
            }}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[310px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-slide-up">
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <h4 className="font-bold text-slate-800 text-sm select-none">
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h4>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-2 text-center text-xs text-slate-400 mb-2 font-medium">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center">
            {monthGrid.map((dateStr, i) => {
              if (!dateStr) return <div key={`empty-${i}`} className="w-8 h-8" />;
              const dayNum = parseInt(dateStr.split('-')[2], 10);
              const disabled = isDateDisabled(dateStr);
              const selected = isSelected(dateStr);
              const inRange =
                !disabled && (isActualRange(dateStr) || isHoverRange(dateStr));

              return (
                <div
                  key={dateStr}
                  className="relative flex items-center justify-center h-8"
                  onMouseEnter={() => !disabled && handleMouseEnter(dateStr)}
                  onMouseLeave={() => setHoverDate(null)}
                >
                  {inRange && (
                    <div className="absolute inset-y-0 left-0 right-0 bg-emerald-50 z-0" />
                  )}
                  {selected && dateStr === startDate && endDate && (
                    <div className="absolute inset-y-0 left-1/2 right-0 bg-emerald-50 z-0" />
                  )}
                  {selected && dateStr === endDate && (
                    <div className="absolute inset-y-0 left-0 right-1/2 bg-emerald-50 z-0" />
                  )}

                  <button
                    type="button"
                    onClick={() => handleDayClick(dateStr)}
                    disabled={disabled}
                    className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center relative z-10 transition-colors ${
                      selected
                        ? 'bg-amber-600 text-white font-bold shadow'
                        : inRange
                          ? 'text-emerald-900 font-semibold'
                          : disabled
                            ? 'text-slate-300 cursor-not-allowed opacity-40'
                            : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {dayNum}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
