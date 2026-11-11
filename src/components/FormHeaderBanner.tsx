import React from 'react';

interface FormHeaderBannerProps {
  title: string;
  onClose: () => void;
  onTableView?: () => void;
  onExportExcel?: () => void;
  extraTools?: React.ReactNode;
  id?: string;
}

export const FormHeaderBanner: React.FC<FormHeaderBannerProps> = ({
  title,
  onClose,
  onTableView,
  onExportExcel,
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

        {/* Table View Icon Button */}
        <button
          type="button"
          title="Tampilan Tabel"
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
          title="Export Excel"
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
