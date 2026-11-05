import React, { useState } from 'react';

interface LaporanSuratJalanPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LaporanSuratJalanPrintForm: React.FC<LaporanSuratJalanPrintFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [tglStart, setTglStart] = useState<string>('12-09-2026');
  const [tglEnd, setTglEnd] = useState<string>('12-09-2026');
  const [filterType, setFilterType] = useState<string>('sales'); // 'merk', 'sales', 'customer', 'all_periode'
  const [salesCode, setSalesCode] = useState<string>('');
  const [salesDesc, setSalesDesc] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>('01 - Laporan Detail Surat Jalan');

  if (!isOpen) return null;

  const handlePreview = () => {
    alert(
      `Memproses Preview Laporan Surat Jalan:\n• Periode: ${tglStart} s/d ${tglEnd}\n• Filter: ${filterType}\n• Lokasi: ${lokasiStock}\n• Bentuk: ${bentukLaporan}`
    );
  };

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex items-start justify-start p-4 select-none">
      {/* Draggable/Fixed Classic Windows Dialog Window matching I-Software - Print Report LAPORAN SURAT JALAN */}
      <div
        id="laporan-surat-jalan-dialog"
        className="pointer-events-auto bg-[#D4D0C8] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] shadow-[3px_3px_10px_rgba(0,0,0,0.4)] w-[540px] flex flex-col font-sans text-xs mt-1 ml-1"
      >
        {/* 1. Classic Windows Aero Title Bar with Gradient & Close Button */}
        <div className="bg-gradient-to-r from-[#0055EA] via-[#2E87FA] to-[#0A66EE] text-white px-2 py-1 flex items-center justify-between font-sans text-[11px] shadow-sm">
          <div className="flex items-center space-x-1.5 font-bold drop-shadow">
            <span className="w-3.5 h-3.5 bg-white/20 border border-white/50 rounded-xs flex items-center justify-center text-[9px]">
              🖶
            </span>
            <span>I-Software - Print Report</span>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-5 h-4.5 bg-gradient-to-b from-[#E76C55] to-[#C93822] hover:from-[#FA7C65] hover:to-[#DE4832] text-white font-bold text-[10px] rounded-xs flex items-center justify-center border border-[#8B1A0E] shadow-xs active:translate-y-px cursor-pointer"
            title="Tutup"
          >
            ✕
          </button>
        </div>

        {/* 2. Main Window Inner Container */}
        <div className="p-3 bg-[#ECE9D8] border border-[#808080] m-1 flex flex-col space-y-3">
          {/* Header Box: LAPORAN SURAT JALAN */}
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-sm tracking-wider text-black font-sans">
              LAPORAN SURAT JALAN
            </h1>
          </div>

          {/* Group 1: Periode */}
          <fieldset className="border border-[#999999] p-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Periode
            </legend>
            <div className="flex items-center space-x-2 pt-0.5">
              <span className="font-semibold text-black text-[11px]">
                Tanggal ( dd-mm-yyyy ) :
              </span>

              <div className="flex items-center bg-white border border-[#7A7A7A]">
                <input
                  type="text"
                  value={tglStart}
                  onChange={(e) => setTglStart(e.target.value)}
                  className="px-1.5 py-0.5 w-20 text-[11px] outline-none font-mono"
                />
                <button
                  type="button"
                  className="px-1 bg-[#D4D0C8] border-l border-[#7A7A7A] hover:bg-[#E5E1D8] text-[9px] h-full"
                >
                  ▼
                </button>
              </div>

              <span className="font-bold text-[11px] px-1 text-black">s / d</span>

              <div className="flex items-center bg-white border border-[#7A7A7A]">
                <input
                  type="text"
                  value={tglEnd}
                  onChange={(e) => setTglEnd(e.target.value)}
                  className="px-1.5 py-0.5 w-20 text-[11px] outline-none font-mono"
                />
                <button
                  type="button"
                  className="px-1 bg-[#D4D0C8] border-l border-[#7A7A7A] hover:bg-[#E5E1D8] text-[9px] h-full"
                >
                  ▼
                </button>
              </div>
            </div>
          </fieldset>

          {/* Group 2: Pilihan Laporan Berdasarkan */}
          <fieldset className="border border-[#999999] p-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Pilihan Laporan Berdasarkan :
            </legend>

            <div className="space-y-1.5 pt-0.5">
              {/* Option 1: Merk Barang (Disabled as shown in image) */}
              <label className="flex items-center space-x-2 text-[11px] text-gray-400 cursor-not-allowed">
                <input
                  type="radio"
                  name="laporan_sj_filter"
                  disabled
                  checked={filterType === 'merk'}
                  onChange={() => setFilterType('merk')}
                  className="cursor-not-allowed"
                />
                <span>Merk Barang</span>
              </label>

              {/* Option 2: Sales with dual inputs (white code + yellow description) */}
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="laporan_sj_filter"
                    checked={filterType === 'sales'}
                    onChange={() => setFilterType('sales')}
                    className="cursor-pointer"
                  />
                  <span>Sales</span>
                </label>

                <div className="flex items-center space-x-1 flex-1 ml-6">
                  <input
                    type="text"
                    value={salesCode}
                    onChange={(e) => setSalesCode(e.target.value)}
                    disabled={filterType !== 'sales'}
                    className="bg-white border border-[#7A7A7A] px-2 py-0.5 w-24 text-[11px] font-mono disabled:bg-[#ECE9D8]"
                  />
                  {/* Yellow description field matching screenshot */}
                  <input
                    type="text"
                    value={salesDesc}
                    readOnly
                    className="bg-[#FFFFCC] border border-[#7A7A7A] px-2 py-0.5 flex-1 text-[11px] shadow-inner"
                  />
                </div>
              </div>

              {/* Option 3: Customer */}
              <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="laporan_sj_filter"
                  checked={filterType === 'customer'}
                  onChange={() => setFilterType('customer')}
                  className="cursor-pointer"
                />
                <span>Customer</span>
              </label>

              {/* Option 4: ALL berdasarkan periode */}
              <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="laporan_sj_filter"
                  checked={filterType === 'all_periode'}
                  onChange={() => setFilterType('all_periode')}
                  className="cursor-pointer"
                />
                <span>ALL berdasarkan periode</span>
              </label>
            </div>
          </fieldset>

          {/* Lower Section: Lokasi Stock & Bentuk Laporan (Left) and Buttons (Right) */}
          <div className="flex items-stretch justify-between gap-3 pt-0.5">
            {/* Left controls */}
            <div className="flex-1 space-y-2">
              {/* Lokasi Stock */}
              <fieldset className="border border-[#999999] px-2 py-1 rounded-none relative">
                <legend className="text-[11px] font-semibold px-1 text-black">
                  Lokasi Stock :
                </legend>
                <div className="flex items-center bg-white border border-[#7A7A7A]">
                  <select
                    value={lokasiStock}
                    onChange={(e) => setLokasiStock(e.target.value)}
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer"
                  >
                    <option value="ALL">ALL</option>
                    <option value="01 - OFFICE">01 - OFFICE</option>
                    <option value="02 - GUDANG JAKARTA">02 - GUDANG JAKARTA</option>
                    <option value="03 - CABANG SURABAYA">03 - CABANG SURABAYA</option>
                  </select>
                </div>
              </fieldset>

              {/* Bentuk Laporan */}
              <fieldset className="border border-[#999999] px-2 py-1 rounded-none relative">
                <legend className="text-[11px] font-semibold px-1 text-black">
                  Bentuk Laporan :
                </legend>
                <div className="flex items-center bg-white border border-[#7A7A7A]">
                  <select
                    value={bentukLaporan}
                    onChange={(e) => setBentukLaporan(e.target.value)}
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer font-bold"
                  >
                    <option value="01 - Laporan Detail Surat Jalan">01 - Laporan Detail Surat Jalan</option>
                    <option value="02 - Laporan Rekap Surat Jalan">02 - Laporan Rekap Surat Jalan</option>
                    <option value="03 - Laporan Surat Jalan by Customer">03 - Laporan Surat Jalan by Customer</option>
                  </select>
                </div>
              </fieldset>
            </div>

            {/* Right Buttons: PREVIEW and CLOSE */}
            <div className="w-[145px] border border-[#999999] p-1.5 flex items-center justify-between gap-1.5 bg-[#E6E2D4]">
              <button
                type="button"
                onClick={handlePreview}
                className="flex-1 h-full py-3 bg-[#EAE6D9] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F2EFE6] active:border-[#808080] active:border-r-[#FFFFFF] active:border-b-[#FFFFFF] font-extrabold text-[12px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
              >
                <span className="border border-dotted border-black/40 px-1 py-1 w-full block">
                  PREVIEW
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-full py-3 bg-[#EAE6D9] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F2EFE6] active:border-[#808080] active:border-r-[#FFFFFF] active:border-b-[#FFFFFF] font-extrabold text-[12px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
              >
                <span className="border border-dotted border-black/40 px-1 py-1 w-full block">
                  <u>C</u>LOSE
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
