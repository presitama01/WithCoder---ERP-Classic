import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

interface LaporanKertasKerjaPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LaporanKertasKerjaPrintForm: React.FC<
  LaporanKertasKerjaPrintFormProps
> = ({ isOpen, onClose }) => {
  const [periode, setPeriode] = useState<string>('09-2026');
  const [bentukLaporan, setBentukLaporan] = useState<string>(
    '01 - Laporan Kertas Kerja I'
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleBaru = () => {
    setPeriode('09-2026');
    setBentukLaporan('01 - Laporan Kertas Kerja I');
    showFeedback('Filter baru direset');
  };

  const handleHapus = () => {
    setPeriode('08-2026');
    setBentukLaporan('01 - Laporan Kertas Kerja I');
    showFeedback('Parameter dikembalikan ke default');
  };

  const handlePreview = () => {
    showFeedback(`Preview: ${bentukLaporan} (Periode ${periode})`);
  };

  return (
    <div
      id="laporan-kertas-kerja-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      {/* Unified Black Header Banner */}
      <FormHeaderBanner
        title="Laporan Kertas Kerja"
        onClose={onClose}
        onExportExcel={() => showFeedback('Export Excel selesai')}
      />

      {/* Main Scrollable Container */}
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-[540px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-2.5 shadow-xs">
          {/* Header Box: Laporan Kertas Kerja I */}
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-bold text-[18px] tracking-normal text-black font-serif">
              Laporan Kertas Kerja I
            </h1>
          </div>

          {/* Action Toolbar */}
          <div className="border-b border-[#999999] pb-2">
            <FormActionButtons
              compact
              onSimpan={() =>
                showFeedback('Parameter Laporan Kertas Kerja tersimpan')
              }
              onBaru={handleBaru}
              onKoreksi={() => showFeedback('Silakan ubah parameter laporan')}
              onHapus={handleHapus}
              feedback={feedback}
            />
          </div>

          {/* Group 1: Range */}
          <fieldset className="border border-[#999999] px-3 pt-2 pb-14 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Range
            </legend>
            <div className="flex items-center space-x-2 pt-0.5">
              <label className="font-bold text-black text-[12px] whitespace-nowrap">
                Periode (mm-yyyy) :
              </label>
              <select
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                className="w-[82px] h-[22px] px-1 bg-white border border-[#7A7A7A] text-[11px] font-sans text-black outline-none cursor-pointer"
              >
                <option value="07-2026">07-2026</option>
                <option value="08-2026">08-2026</option>
                <option value="09-2026">09-2026</option>
                <option value="10-2026">10-2026</option>
                <option value="11-2026">11-2026</option>
                <option value="12-2026">12-2026</option>
              </select>
            </div>
          </fieldset>

          {/* Group 2: Bentuk Laporan */}
          <fieldset className="border border-[#999999] px-3 py-2.5 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Bentuk Laporan
            </legend>
            <div className="flex items-center bg-white border border-[#7A7A7A]">
              <select
                value={bentukLaporan}
                onChange={(e) => setBentukLaporan(e.target.value)}
                className="w-full h-[22px] px-1.5 text-[11px] bg-white text-black outline-none cursor-pointer"
              >
                <option value="01 - Laporan Kertas Kerja I">
                  01 - Laporan Kertas Kerja I
                </option>
                <option value="02 - Laporan Kertas Kerja II">
                  02 - Laporan Kertas Kerja II
                </option>
                <option value="03 - Neraca Percobaan">
                  03 - Neraca Percobaan
                </option>
                <option value="04 - Laporan Laba Rugi">
                  04 - Laporan Laba Rugi
                </option>
                <option value="05 - Neraca">05 - Neraca</option>
              </select>
            </div>
          </fieldset>

          {/* Bottom Buttons: Preview & Close */}
          <div className="flex items-center justify-around pt-1 pb-0.5">
            <button
              type="button"
              onClick={handlePreview}
              className="w-[106px] h-[28px] bg-[#ECE9D8] hover:bg-[#F5F3E8] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white font-bold text-[12px] text-black shadow-2xs cursor-pointer flex items-center justify-center"
            >
              <span>
                <span className="underline">P</span>review
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-[106px] h-[28px] bg-[#ECE9D8] hover:bg-[#F5F3E8] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white font-bold text-[12px] text-black shadow-2xs cursor-pointer flex items-center justify-center"
            >
              <span>
                <span className="underline">C</span>lose
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
