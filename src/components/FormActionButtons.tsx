import React from 'react';

interface FormActionButtonsProps {
  onSimpan?: () => void;
  onBaru?: () => void;
  onKoreksi?: () => void;
  onHapus?: () => void;
  onPrint?: () => void;
  onFind?: () => void;
  compact?: boolean;
  isBusy?: boolean;
  feedback?: string | null;
}

export const FormActionButtons: React.FC<FormActionButtonsProps> = ({
  onSimpan,
  onBaru,
  onKoreksi,
  onHapus,
  onPrint,
  onFind,
  compact = false,
  isBusy = false,
  feedback,
}) => {
  const btnClass = compact
    ? 'h-[25px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] active:bg-[#DCD8C8] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] flex items-center space-x-1.5 text-[11px] font-sans text-black cursor-pointer select-none whitespace-nowrap disabled:opacity-50'
    : 'h-[28px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] active:bg-[#DCD8C8] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] flex items-center space-x-1.5 text-[11px] font-sans text-black cursor-pointer select-none whitespace-nowrap disabled:opacity-50';

  return (
    <div className="flex items-center space-x-1.5">
      {/* 1. Simpan */}
      <button
        type="button"
        onClick={onSimpan}
        disabled={isBusy}
        className={btnClass}
        title="Simpan Data"
      >
        <span>Simpan</span>
      </button>

      {/* 2. + Baru */}
      <button
        type="button"
        onClick={onBaru}
        disabled={isBusy}
        className={btnClass}
        title="Tambah Data Baru"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <path
            d="M6 1.5V10.5M1.5 6H10.5"
            stroke="#10893E"
            strokeWidth="2.2"
            strokeLinecap="square"
          />
        </svg>
        <span>Baru</span>
      </button>

      {/* 3. Pencil Koreksi */}
      <button
        type="button"
        onClick={onKoreksi}
        disabled={isBusy}
        className={btnClass}
        title="Koreksi / Edit Data"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <path
            d="M2.5 2.5L4.3 1.7L12.7 10.1L13.5 13.5L10.1 12.7L1.7 4.3L2.5 2.5Z"
            fill="#F4B400"
            stroke="#333333"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M2.2 4.8L4.8 2.2L3.5 1.4C3 1.2 2.4 1.3 2 1.7L1.7 2C1.3 2.4 1.2 3 1.4 3.5L2.2 4.8Z"
            fill="#E05347"
            stroke="#333333"
            strokeWidth="0.9"
          />
          <path d="M12.2 12.2L13.6 13.6L11.2 13L12.2 12.2Z" fill="#333333" />
        </svg>
        <span>Koreksi</span>
      </button>

      {/* 4. Trash Hapus */}
      <button
        type="button"
        onClick={onHapus}
        disabled={isBusy}
        className={btnClass}
        title="Hapus Data"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <path
            d="M3.5 4.5H12.5L11.7 13.5C11.65 14 11.25 14.3 10.7 14.3H5.3C4.75 14.3 4.35 14 4.3 13.5L3.5 4.5Z"
            fill="#A6A6A6"
            stroke="#444444"
            strokeWidth="1"
          />
          <ellipse cx="8" cy="4.2" rx="4.8" ry="1.3" fill="#C8C8C8" stroke="#444444" strokeWidth="1" />
          <path d="M6 6.5V12.5M8 6.5V12.5M10 6.5V12.5" stroke="#555555" strokeWidth="0.9" />
        </svg>
        <span>Hapus</span>
      </button>

      {/* Optional 5. Print */}
      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          disabled={isBusy}
          className={btnClass}
          title="Print / Preview A4"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <rect x="4" y="1.5" width="8" height="4" fill="#FFFFFF" stroke="#333" strokeWidth="1" />
            <rect x="1.5" y="5" width="13" height="6" rx="1" fill="#D1D5DB" stroke="#333" strokeWidth="1" />
            <rect x="4" y="8.5" width="8" height="6" fill="#FFFFFF" stroke="#333" strokeWidth="1" />
          </svg>
          <span>Print</span>
        </button>
      )}

      {/* Optional 6. FIND */}
      {onFind && (
        <button
          type="button"
          onClick={onFind}
          disabled={isBusy}
          className={btnClass}
          title="Find / Cari Data"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="#0055EA" strokeWidth="1.8" />
            <path d="M10 10L14 14" stroke="#0055EA" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Find</span>
        </button>
      )}

      {feedback && (
        <span className="ml-2 px-2 py-0.5 bg-[#FFFFCC] border border-[#ACA899] text-[10px] font-semibold text-black rounded-[1px]">
          {feedback}
        </span>
      )}
    </div>
  );
};
