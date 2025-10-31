import React, { useRef, useEffect } from 'react';

// flatpickr is loaded from a CDN, so we declare it globally.
declare const flatpickr: any;

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
  name: string;
  required?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label, name, required = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpInstanceRef = useRef<any>(null); // To hold the flatpickr instance

  useEffect(() => {
    // Ensure the input element is mounted before initializing flatpickr
    if (inputRef.current) {
      fpInstanceRef.current = flatpickr(inputRef.current, {
        dateFormat: 'Y-m-d',
        defaultDate: value,
        onChange: (selectedDates: Date[]) => {
          if (selectedDates[0]) {
            // FIX: Use local date parts to prevent timezone shifts.
            // new Date().toISOString() converts the date to UTC, which can
            // result in the previous day depending on the user's timezone.
            const date = selectedDates[0];
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            onChange(dateString);
          }
        },
      });
    }

    // Cleanup function: destroy the flatpickr instance when the component unmounts
    return () => {
      if (fpInstanceRef.current) {
        fpInstanceRef.current.destroy();
      }
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount

  // This effect listens for external changes to the `value` prop and updates flatpickr
  useEffect(() => {
     if (fpInstanceRef.current && value !== fpInstanceRef.current.input.value) {
         // Set the date in flatpickr instance without triggering the onChange event
         fpInstanceRef.current.setDate(value, false);
     }
  }, [value]);

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        ref={inputRef}
        id={name}
        name={name}
        type="text" // flatpickr works best with text inputs
        placeholder="YYYY-MM-DD"
        required={required}
        // Use readOnly to prevent manual typing, ensuring valid date format
        readOnly
        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm"
      />
    </div>
  );
};

export default DatePicker;