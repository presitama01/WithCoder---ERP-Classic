import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isBusy?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Konfirmasi Hapus Data',
  message,
  detail,
  confirmLabel = 'Ya, Hapus',
  cancelLabel = 'Batal',
  isBusy = false,
  danger = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 font-sans select-none">
      <div className="w-[430px] max-w-[95vw] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl overflow-hidden text-[11px] text-black">
        <div
          className={`flex items-center justify-between h-[24px] px-2 text-white font-bold ${
            danger
              ? 'bg-gradient-to-r from-[#8B0000] to-[#D9534F]'
              : 'bg-gradient-to-r from-[#0A246A] to-[#A6CAF0]'
          }`}
        >
          <span>{title}</span>
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="w-[16px] h-[15px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          <div className="font-bold text-[12px] text-black leading-snug">{message}</div>
          {detail && (
            <div className="bg-white border border-[#ACA899] px-2.5 py-2 text-[11px] text-gray-800 whitespace-pre-line">
              {detail}
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-2 border-t border-[#ACA899]">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isBusy}
              className={`px-4 py-1 border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] font-bold cursor-pointer ${
                danger
                  ? 'bg-[#C00000] text-white hover:bg-[#A00000]'
                  : 'bg-[#ECE9D8] text-black hover:bg-[#F2EFE2]'
              }`}
            >
              {isBusy ? 'Memproses...' : confirmLabel}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isBusy}
              className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] hover:bg-[#F2EFE2] cursor-pointer"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
