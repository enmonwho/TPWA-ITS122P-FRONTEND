import { useState } from 'react';
import CalendarPopover from './CalendarPopover';

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
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  return (
    <div className="date-inputs-row">
      <div
        className="input-gradient-border"
        style={{
          flex: 1,
          borderColor: errorStart ? 'red' : undefined,
          position: 'relative',
        }}
      >
        <input
          type="text"
          readOnly
          className="modal-input"
          placeholder="Start Date"
          value={startDate}
          onClick={() => {
            setShowStartDatePicker(true);
            setShowEndDatePicker(false);
          }}
          style={{ cursor: 'pointer' }}
        />
        {showStartDatePicker && (
          <div className="popover-container">
            <CalendarPopover
              selectedDate={startDate}
              onSelect={(date) => {
                onStartDateChange(date);
                setShowStartDatePicker(false);
              }}
              onClose={() => setShowStartDatePicker(false)}
            />
          </div>
        )}
      </div>
      <span
        style={{
          fontFamily: 'SF Pro Rounded, sans-serif',
          fontWeight: 500,
          fontSize: '16px',
        }}
      >
        to
      </span>
      <div
        className="input-gradient-border"
        style={{
          flex: 1,
          borderColor: errorEnd ? 'red' : undefined,
          position: 'relative',
        }}
      >
        <input
          type="text"
          readOnly
          aria-label="End Date"
          className="modal-input"
          placeholder="End Date"
          value={endDate}
          onClick={() => {
            setShowEndDatePicker(true);
            setShowStartDatePicker(false);
          }}
          style={{ cursor: 'pointer' }}
        />
        {showEndDatePicker && (
          <div className="popover-container">
            <CalendarPopover
              selectedDate={endDate}
              minDate={startDate}
              onSelect={(date) => {
                onEndDateChange(date);
                setShowEndDatePicker(false);
              }}
              onClose={() => setShowEndDatePicker(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
