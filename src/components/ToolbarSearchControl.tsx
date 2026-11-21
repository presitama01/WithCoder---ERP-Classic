import React from 'react';

export interface SearchFieldOption {
  value: string;
  label: string;
}

interface ToolbarSearchControlProps {
  searchField: string;
  onSearchFieldChange: (field: string) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onCari: () => void;
  onReset: () => void;
  options: SearchFieldOption[];
  inputRef?: React.RefObject<HTMLInputElement | null>;
  isBusy?: boolean;
  placeholder?: string;
  inputWidthClass?: string;
  compact?: boolean;
}

export const ToolbarSearchControl: React.FC<ToolbarSearchControlProps> = ({
  searchField,
  onSearchFieldChange,
  searchTerm,
  onSearchTermChange,
  onCari,
  onReset,
  options,
  inputRef,
  isBusy = false,
  placeholder = 'Ketik Kode atau kata kunci...',
  inputWidthClass = 'w-[165px]',
  compact = false,
}) => {
  const hClass = compact ? 'h-[22px]' : 'h-[24px]';
  return (
    <div className="ml-auto flex items-center space-x-1.5 text-[11px] shrink-0">
      <span className="font-semibold text-black whitespace-nowrap">Cari:</span>
      <select
        value={searchField}
        onChange={(e) => onSearchFieldChange(e.target.value)}
        className={`${hClass} bg-white border border-[#7F9DB9] px-1 text-[11px] text-black outline-none`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onCari();
          }
        }}
        placeholder={placeholder}
        className={`${hClass} ${inputWidthClass} bg-white border border-[#7F9DB9] px-2 text-[11px] text-black outline-none focus:border-[#316AC5]`}
      />
      <button
        type="button"
        disabled={isBusy}
        onClick={onCari}
        title="Cari langsung di Supabase (Enter)"
        className={`${hClass} px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold text-black cursor-pointer disabled:opacity-50`}
      >
        Cari
      </button>
      <button
        type="button"
        disabled={isBusy}
        onClick={onReset}
        title="Reset filter pencarian & muat ulang"
        className={`${hClass} px-2 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] text-black cursor-pointer disabled:opacity-50`}
      >
        Reset
      </button>
    </div>
  );
};
