import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPopoverProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  minDate?: string;
  onClose: () => void;
}

export default function CalendarPopover({
  selectedDate,
  onSelect,
  minDate,
  onClose,
}: CalendarPopoverProps) {
  // Initialize to selected date or today
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  // Ensure valid date, otherwise today
  const validInitialDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [currentMonth, setCurrentMonth] = useState(validInitialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(validInitialDate.getFullYear());

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const minDateObj = useMemo(() => {
    if (!minDate) return null;
    const d = new Date(minDate);
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }, [minDate]);

  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return null;
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }, [selectedDate]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => (prev === 0 ? 11 : prev - 1));
    if (currentMonth === 0) setCurrentYear((prev) => prev - 1);
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => (prev === 11 ? 0 : prev + 1));
    if (currentMonth === 11) setCurrentYear((prev) => prev + 1);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null); // Empty slots
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isDateDisabled = (day: number) => {
    if (!minDateObj) return false;
    const dateToCheck = new Date(currentYear, currentMonth, day);
    return dateToCheck < minDateObj;
  };

  const isDateSelected = (day: number) => {
    if (!selectedDateObj) return false;
    return (
      selectedDateObj.getDate() === day &&
      selectedDateObj.getMonth() === currentMonth &&
      selectedDateObj.getFullYear() === currentYear
    );
  };

  const handleDateClick = (day: number) => {
    if (isDateDisabled(day)) return;

    // Format YYYY-MM-DD reliably
    const m = (currentMonth + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    onSelect(`${currentYear}-${m}-${d}`);
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div
      ref={popoverRef}
      className="custom-calendar-popover"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 50,
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '12px',
        width: '260px',
        marginTop: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <button
          onClick={handlePrevMonth}
          type="button"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <span
          style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-neutral-900)' }}
        >
          {monthNames[currentMonth]} {currentYear}
        </span>
        <button
          onClick={handleNextMonth}
          type="button"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '4px',
        }}
      >
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontSize: '12px',
              color: 'var(--color-neutral-500)',
              fontWeight: 500,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;

          const disabled = isDateDisabled(day);
          const selected = isDateSelected(day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateClick(day)}
              disabled={disabled}
              className={`calendar-day-btn ${selected ? 'selected' : ''}`}
              style={{
                width: '100%',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                border: 'none',
                borderRadius: '4px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                backgroundColor: selected ? 'var(--color-brand-red)' : 'transparent',
                color: selected
                  ? '#fff'
                  : disabled
                    ? 'var(--color-neutral-300)'
                    : 'var(--color-neutral-800)',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
