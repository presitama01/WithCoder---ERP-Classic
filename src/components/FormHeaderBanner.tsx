import React from 'react';

interface FormHeaderBannerProps {
  title: string;
  onClose: () => void;
  onTableView?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
  onFind?: () => void;
  extraTools?: React.ReactNode;
  id?: string;
}

export const FormHeaderBanner: React.FC<FormHeaderBannerProps> = ({
  title,
  onClose,
  onTableView,
  onExportExcel,
  onPrint,
  onFind,
  extraTools,
  id,
}) => {
  return (
    <div
      id={id}
      className="shrink-0 flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333] select-none"
    >
      <span className="text-[17px] font-sans font-bold tracking-tight text-white drop-shadow truncate pr-3">
        {title}
      </span>

      <div className="flex items-center space-x-1.5 shrink-0">
        {extraTools}

        {/* FIND / Search Focus Icon Button */}
        {onFind && (
          <button
            type="button"
            title="Find / Cari Data"
            onClick={onFind}
            className="h-[22px] px-1.5 bg-[#2B579A] border border-white/80 rounded-[1px] flex items-center space-x-1 hover:brightness-110 cursor-pointer text-[10px] font-bold text-white"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="#FFFFFF" strokeWidth="1.8" />
              <path d="M10 10L14 14" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>FIND</span>
          </button>
        )}

        {/* Print / Preview A4 Icon Button */}
        {onPrint && (
          <button
            type="button"
            title="Print / Preview A4"
            onClick={onPrint}
            className="w-[24px] h-[22px] bg-[#3B4A6B] border border-white/80 rounded-[1px] flex items-center justify-center p-[2px] hover:brightness-110 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="4" y="1.5" width="8" height="4" fill="#FFFFFF" stroke="#111" strokeWidth="0.8" />
              <rect x="1.5" y="5" width="13" height="6" rx="1" fill="#D1D5DB" stroke="#111" strokeWidth="0.8" />
              <rect x="4" y="8.5" width="8" height="6" fill="#FFFFFF" stroke="#111" strokeWidth="0.8" />
              <line x1="5.5" y1="10.5" x2="10.5" y2="10.5" stroke="#111" strokeWidth="0.9" />
              <line x1="5.5" y1="12.5" x2="9.5" y2="12.5" stroke="#111" strokeWidth="0.9" />
            </svg>
          </button>
        )}

        {/* Table View Icon Button */}
        <button
          type="button"
          title="Refresh / Tampilan Tabel"
          onClick={onTableView}
          className="w-[24px] h-[22px] bg-[#1F4E79] border border-white/80 rounded-[1px] flex items-center justify-center p-[2px] hover:brightness-110 cursor-pointer"
        >
          <div className="w-full h-full border border-white/60 grid grid-cols-2 gap-[1px] bg-white p-[1px]">
            <div className="bg-[#2B579A] col-span-2 h-[3px]" />
            <div className="bg-[#E7EFF9] h-[4px]" />
            <div className="bg-[#E7EFF9] h-[4px]" />
          </div>
        </button>

        {/* Excel Export Icon Button */}
        <button
          type="button"
          title="Export to Excel"
          onClick={onExportExcel}
          className="w-[24px] h-[22px] bg-[#1E7145] border border-white/80 rounded-[1px] flex items-center justify-center hover:brightness-110 cursor-pointer"
        >
          <div className="relative flex items-center justify-center">
            <span className="text-[11px] font-bold text-white font-sans tracking-tighter">
              X
            </span>
            <div className="absolute -bottom-1 -right-1 w-[7px] h-[5px] bg-white grid grid-cols-2 gap-[0.5px]">
              <div className="bg-[#1E7145]" />
              <div className="bg-[#1E7145]" />
              <div className="bg-[#1E7145]" />
              <div className="bg-[#1E7145]" />
            </div>
          </div>
        </button>

        {/* Close Form [X] Button */}
        <button
          type="button"
          onClick={onClose}
          title="Tutup Form"
          className="ml-2 w-[22px] h-[22px] bg-[#C00000] hover:bg-[#E81123] text-white font-bold border border-white/80 rounded-[1px] flex items-center justify-center cursor-pointer"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="square"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
