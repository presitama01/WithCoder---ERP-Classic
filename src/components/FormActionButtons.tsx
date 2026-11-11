import React from 'react';

interface FormActionButtonsProps {
  onSimpan?: () => void;
  onBaru?: () => void;
  onKoreksi?: () => void;
  onHapus?: () => void;
  compact?: boolean;
  feedback?: string | null;
}

export const FormActionButtons: React.FC<FormActionButtonsProps> = ({
  onSimpan,
  onBaru,
  onKoreksi,
  onHapus,
  compact = false,
  feedback,
}) => {
  const btnClass = compact
    ? 'h-[25px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] active:bg-[#DCD8C8] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] flex items-center space-x-1.5 text-[11px] font-sans text-black cursor-pointer select-none whitespace-nowrap'
    : 'h-[28px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] active:bg-[#DCD8C8] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] flex items-center space-x-1.5 text-[11px] font-sans text-black cursor-pointer select-none whitespace-nowrap';

  return (
    <div className="flex items-center space-x-1.5">
      {/* 1. Simpan */}
      <button type="button" onClick={onSimpan} className={btnClass} title="Simpan Data">
        <span>Simpan</span>
      </button>

      {/* 2. + Baru */}
      <button type="button" onClick={onBaru} className={btnClass} title="Tambah Data Baru">
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
      <button type="button" onClick={onKoreksi} className={btnClass} title="Koreksi / Edit Data">
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
      <button type="button" onClick={onHapus} className={btnClass} title="Hapus Data">
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

      {feedback && (
        <span className="ml-2 px-2 py-0.5 bg-[#FFFFCC] border border-[#ACA899] text-[10px] font-semibold text-black rounded-[1px]">
          {feedback}
        </span>
      )}
    </div>
  );
};
