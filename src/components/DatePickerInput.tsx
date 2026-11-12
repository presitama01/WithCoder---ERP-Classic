import React, { useRef } from 'react';
import { toDisplayDmy, toDisplayDMyShort, toIsoDate } from '../lib/erpApi';

interface DatePickerInputProps {
  value: string;
  onChange: (formattedValue: string, isoValue: string) => void;
  format?: 'dmy' | 'dMyShort' | 'iso';
  id?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  format = 'dmy',
  id,
  className = '',
  inputClassName = '',
  disabled = false,
  placeholder = 'dd-mm-yyyy',
}) => {
  const hiddenDateRef = useRef<HTMLInputElement>(null);
  const isoValue = toIsoDate(value) || '';

  const formatIso = (iso: string): string => {
    if (!iso) return '';
    if (format === 'iso') return iso;
    if (format === 'dMyShort') return toDisplayDMyShort(iso);
    return toDisplayDmy(iso);
  };

  const handleOpenPicker = () => {
    if (disabled) return;
    const el = hiddenDateRef.current;
    if (!el) return;
    try {
      if (typeof (el as any).showPicker === 'function') {
        (el as any).showPicker();
      } else {
        el.focus();
        el.click();
      }
    } catch {
      el.focus();
      el.click();
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <input
        id={id}
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          const parsedIso = toIsoDate(raw) || '';
          onChange(raw, parsedIso);
        }}
        onBlur={() => {
          const parsedIso = toIsoDate(value);
          if (parsedIso) {
            onChange(formatIso(parsedIso), parsedIso);
          }
        }}
        className={
          inputClassName ||
          'h-[22px] w-[104px] bg-white border border-[#7F9DB9] px-1.5 text-[11px] font-sans text-black outline-none focus:border-[#316AC5]'
        }
      />

      {/* Native calendar input positioned over the dropdown button for 100% cross-browser popup reliability */}
      <div className="relative shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={handleOpenPicker}
          title="Pilih Tanggal"
          className="h-[22px] w-[18px] bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7F9DB9] border-l-0 flex items-center justify-center cursor-pointer disabled:opacity-50"
        >
          <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
            <polygon points="0,0 7,0 3.5,4" fill="#000000" />
          </svg>
        </button>
        <input
          ref={hiddenDateRef}
          type="date"
          tabIndex={-1}
          disabled={disabled}
          value={isoValue}
          onChange={(e) => {
            const pickedIso = e.target.value;
            onChange(formatIso(pickedIso), pickedIso);
          }}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          aria-label="Pilih Tanggal"
        />
      </div>
    </div>
  );
};
