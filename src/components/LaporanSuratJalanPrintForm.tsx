import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

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
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleBaru = () => {
    setTglStart('12-09-2026');
    setTglEnd('12-09-2026');
    setFilterType('sales');
    setSalesCode('');
    setSalesDesc('');
    setLokasiStock('ALL');
    setBentukLaporan('01 - Laporan Detail Surat Jalan');
    showFeedback('Filter baru direset');
  };

  const handleHapus = () => {
    setSalesCode('');
    setSalesDesc('');
    showFeedback('Parameter dibersihkan');
  };

  const handlePreview = () => {
    showFeedback(`Preview: ${bentukLaporan} (${tglStart} s/d ${tglEnd})`);
  };

  return (
    <div
      id="laporan-surat-jalan-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Laporan Surat Jalan"
        onClose={onClose}
        onExportExcel={() => showFeedback('Export Excel selesai')}
      />

      {/* Main Scrollable Container */}
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-[560px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-3 shadow-xs">
          {/* Header Box: LAPORAN SURAT JALAN */}
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-sm tracking-wider text-black font-sans">
              LAPORAN SURAT JALAN
            </h1>
          </div>

          {/* Action Toolbar */}
          <div className="border-b border-[#999999] pb-2">
            <FormActionButtons
              compact
              onSimpan={() => showFeedback('Parameter Laporan Surat Jalan tersimpan')}
              onBaru={handleBaru}
              onKoreksi={() => showFeedback('Silakan ubah filter laporan')}
              onHapus={handleHapus}
              feedback={feedback}
            />
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

            {/* Right Button: PREVIEW */}
            <div className="w-[100px] border border-[#999999] p-1.5 flex items-center justify-center bg-[#E6E2D4]">
              <button
                type="button"
                onClick={handlePreview}
                className="w-full h-full py-3 bg-[#EAE6D9] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F2EFE6] active:border-[#808080] active:border-r-[#FFFFFF] active:border-b-[#FFFFFF] font-extrabold text-[12px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
              >
                <span className="border border-dotted border-black/40 px-1 py-1 w-full block">
                  PREVIEW
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
