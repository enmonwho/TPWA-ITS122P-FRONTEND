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
    
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= end.getDate(); i++) {
      const d = new Date(year, month, i);
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push(str);
    }
    return days;
  };

  const handleDayClick = (dateStr: string) => {
    if (step === 0) {
      onStartDateChange(dateStr);
      onEndDateChange(''); 
      setStep(1);
    } else {
      const d1 = new Date(startDate);
      const d2 = new Date(dateStr);
      if (d2 < d1) {
        onStartDateChange(dateStr);
        onEndDateChange('');
        setStep(1);
      } else {
        onEndDateChange(dateStr);
        setStep(0);
        setIsOpen(false);
      }
    }
  };

  const handleMouseEnter = (dateStr: string) => {
    if (step === 1 && startDate) {
      setHoverDate(dateStr);
    }
  };

  const isSelected = (dateStr: string) => dateStr === startDate || dateStr === endDate;
  const isHoverRange = (dateStr: string) => {
    if (step !== 1 || !startDate || !hoverDate) return false;
    const d = new Date(dateStr);
    const s = new Date(startDate);
    const h = new Date(hoverDate);
    return d > s && d <= h;
  };
  const isActualRange = (dateStr: string) => {
    if (!startDate || !endDate) return false;
    const d = new Date(dateStr);
    const s = new Date(startDate);
    const e = new Date(endDate);
    return d > s && d < e;
  };

  const shiftMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const renderMonth = (offset: number) => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth() + offset;
    const dateObj = new Date(y, m, 1);
    const grid = generateMonthGrid(dateObj.getFullYear(), dateObj.getMonth());
    
    return (
      <div className="w-full">
        <h4 className="text-center font-bold text-slate-800 mb-4">
          {dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h4>
        <div className="grid grid-cols-7 gap-y-2 text-center text-xs text-slate-400 mb-2">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center">
          {grid.map((dateStr, i) => {
            if (!dateStr) return <div key={`empty-${i}`} className="w-8 h-8" />;
            const dayNum = parseInt(dateStr.split('-')[2], 10);
            const selected = isSelected(dateStr);
            const inRange = isActualRange(dateStr) || isHoverRange(dateStr);
            
            return (
              <div 
                key={dateStr}
                className="relative flex items-center justify-center h-8"
                onMouseEnter={() => handleMouseEnter(dateStr)}
                onMouseLeave={() => setHoverDate(null)}
              >
                {inRange && <div className="absolute inset-y-0 left-0 right-0 bg-emerald-50 z-0" />}
                {selected && dateStr === startDate && endDate && <div className="absolute inset-y-0 left-1/2 right-0 bg-emerald-50 z-0" />}
                {selected && dateStr === endDate && <div className="absolute inset-y-0 left-0 right-1/2 bg-emerald-50 z-0" />}
                
                <button
                  type="button"
                  onClick={() => handleDayClick(dateStr)}
                  className={`relative z-10 w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors
                    ${selected ? 'bg-emerald-500 text-white font-bold shadow-md' : 'text-slate-700 hover:bg-slate-100'}`
                  }
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
    <div className="relative" ref={popoverRef}>
      <div className="flex items-center gap-3">
        <div className="input-gradient-border relative flex-1" style={{ borderColor: errorStart ? 'red' : undefined }}>
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            readOnly
            className="modal-input pl-10"
            placeholder="Start Date"
            value={startDate}
            onClick={() => { setIsOpen(true); setStep(0); }}
            style={{ cursor: 'pointer' }}
          />
        </div>
        <span className="text-slate-500 font-medium">to</span>
        <div className="input-gradient-border relative flex-1" style={{ borderColor: errorEnd ? 'red' : undefined }}>
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            readOnly
            className="modal-input pl-10"
            placeholder="End Date"
            value={endDate}
            onClick={() => { setIsOpen(true); setStep(1); }}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-[580px] bg-white rounded-2xl shadow-xl border border-slate-200 p-6 z-50 animate-slide-up">
          <div className="flex justify-between items-center absolute w-full left-0 px-4 top-6 z-10">
            <button type="button" onClick={() => shiftMonth(-1)} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => shiftMonth(1)} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"><ChevronRight size={16} /></button>
          </div>
          
          <div className="grid grid-cols-2 gap-8 relative mt-2">
            {renderMonth(0)}
            {renderMonth(1)}
          </div>
        </div>
      )}
    </div>
  );
}