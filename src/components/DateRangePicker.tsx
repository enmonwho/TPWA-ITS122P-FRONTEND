import { useMemo } from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  errorStart?: boolean;
  errorEnd?: boolean;
  modalRef?: React.RefObject<HTMLElement | null>;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  errorStart,
  errorEnd,
}: DateRangePickerProps) {
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onStartDateChange(val);
    if (endDate && val && endDate <= val) {
      onEndDateChange('');
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEndDateChange(e.target.value);
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className="input-gradient-border relative flex-1 flex items-center"
        style={{ borderColor: errorStart ? 'red' : undefined }}
      >
        <input
          id="startDate"
          type="date"
          className="modal-input native-date-input"
          value={startDate}
          min={todayStr}
          onChange={handleStartDateChange}
          onClick={(e) => e.currentTarget.showPicker?.()}
          aria-label="Start Date"
        />
      </div>
      <span className="text-slate-500 font-medium text-sm select-none">to</span>
      <div
        className="input-gradient-border relative flex-1 flex items-center"
        style={{ borderColor: errorEnd ? 'red' : undefined }}
      >
        <input
          id="endDate"
          type="date"
          className="modal-input native-date-input"
          value={endDate}
          min={startDate || todayStr}
          onChange={handleEndDateChange}
          onClick={(e) => e.currentTarget.showPicker?.()}
          aria-label="End Date"
        />
      </div>
    </div>
  );
}

export const TripDateRangePicker = DateRangePicker;
export default DateRangePicker;
