import { useState, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import AnchoredPopover from './AnchoredPopover';

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

  const startAnchorRef = useRef<HTMLDivElement>(null);
  const endAnchorRef = useRef<HTMLDivElement>(null);

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

  const renderMonth = (offset: number) => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth() + offset;
    const dateObj = new Date(y, m, 1);
    const grid = generateMonthGrid(dateObj.getFullYear(), dateObj.getMonth());

    return (
      <div className="w-full">
        <h4 className="text-center font-bold text-[#2F1B0C] text-[13px] mb-3 select-none">
          {dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h4>

        <div className="grid grid-cols-7 gap-y-2 text-center text-[9px] text-[#74675D] mb-2 font-semibold">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center">
          {grid.map((dateStr, i) => {
            if (!dateStr) return <div key={`empty-${offset}-${i}`} className="w-8 h-8" />;
            const dayNum = parseInt(dateStr.split('-')[2], 10);
            const disabled = isDateDisabled(dateStr);
            const selected = isSelected(dateStr);
            const inRange =
              !disabled && (isActualRange(dateStr) || isHoverRange(dateStr));

            return (
              <div
                key={dateStr}
                className="relative flex items-center justify-center h-8"
              >
                {inRange && (
                  <div className="absolute inset-y-0 left-0 right-0 bg-[#eef4f8] z-0" />
                )}
                {selected && dateStr === startDate && endDate && (
                  <div className="absolute inset-y-0 left-1/2 right-0 bg-[#eef4f8] z-0" />
                )}
                {selected && dateStr === endDate && (
                  <div className="absolute inset-y-0 left-0 right-1/2 bg-[#eef4f8] z-0" />
                )}

                <button
                  type="button"
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => !disabled && handleMouseEnter(dateStr)}
                  onMouseLeave={() => setHoverDate(null)}
                  disabled={disabled}
                  className={`w-7 h-7 rounded-full text-[11px] font-medium flex items-center justify-center relative z-10 transition-colors ${
                    selected
                      ? 'bg-[#255F85] text-white font-bold shadow-sm'
                      : inRange
                        ? 'text-[#255F85] font-semibold'
                        : disabled
                          ? 'text-[#74675D] cursor-not-allowed opacity-35'
                          : 'text-[#2F1B0C] hover:bg-[#255F85]/10'
                  }`}
                >
                  {dayNum}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <div
          ref={startAnchorRef}
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
          ref={endAnchorRef}
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
        <AnchoredPopover
          anchorRef={step === 0 ? startAnchorRef : endAnchorRef}
          onClose={() => setIsOpen(false)}
          width={590}
          estimatedHeight={360}
          className="date-range-popover bg-white rounded-2xl shadow-[0_16px_40px_rgba(47,27,12,0.18)] border border-[rgba(72,42,19,0.16)] p-6 overflow-y-auto animate-slide-up"
          role="dialog"
        >
          <div className="flex justify-between items-center mb-3">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="w-8 h-8 rounded-full border border-[rgba(72,42,19,0.16)] flex items-center justify-center text-[#255F85] hover:bg-[#255F85]/10 active:scale-95 transition-all shadow-sm bg-white cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="w-8 h-8 rounded-full border border-[rgba(72,42,19,0.16)] flex items-center justify-center text-[#255F85] hover:bg-[#255F85]/10 active:scale-95 transition-all shadow-sm bg-white cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative">
            {renderMonth(0)}
            <div className="hidden sm:block">{renderMonth(1)}</div>
          </div>
        </AnchoredPopover>
      )}
    </div>
  );
}

export const TripDateRangePicker = DateRangePicker;
export default DateRangePicker;
