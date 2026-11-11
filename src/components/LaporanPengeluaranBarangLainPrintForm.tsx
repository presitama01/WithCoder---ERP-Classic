import React, { useState, useRef } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

interface LaporanPengeluaranBarangLainPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LaporanPengeluaranBarangLainPrintForm: React.FC<
  LaporanPengeluaranBarangLainPrintFormProps
> = ({ isOpen, onClose }) => {
  const [tglStart, setTglStart] = useState<string>('12-09-2026');
  const [tglEnd, setTglEnd] = useState<string>('12-09-2026');
  const [filterType, setFilterType] = useState<
    'merk' | 'batasan_no_bukti' | 'customer' | 'all_periode'
  >('batasan_no_bukti');
  const [noBuktiStart, setNoBuktiStart] = useState<string>('');
  const [noBuktiEnd, setNoBuktiEnd] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const tglStartPickerRef = useRef<HTMLInputElement>(null);
  const tglEndPickerRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleDatePickerChange = (
    isoDate: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (!isoDate) return;
    const [yyyy, mm, dd] = isoDate.split('-');
    if (yyyy && mm && dd) {
      setter(`${dd}-${mm}-${yyyy}`);
    }
  };

  const handleBaru = () => {
    setTglStart('12-09-2026');
    setTglEnd('12-09-2026');
    setFilterType('batasan_no_bukti');
    setNoBuktiStart('');
    setNoBuktiEnd('');
    setLokasiStock('ALL');
    setBentukLaporan('');
    showFeedback('Filter baru direset');
  };

  const handleHapus = () => {
    setNoBuktiStart('');
    setNoBuktiEnd('');
    showFeedback('Parameter dibersihkan');
  };

  const handlePreview = () => {
    const filterLabel =
      filterType === 'batasan_no_bukti'
        ? noBuktiStart.trim() || noBuktiEnd.trim()
          ? `No.Bukti ${noBuktiStart || '-'} s/d ${noBuktiEnd || '-'}`
          : 'Batasan No.Bukti'
        : filterType === 'customer'
        ? 'Customer'
        : 'ALL berdasarkan periode';
    const reportLabel = bentukLaporan || 'Laporan Pengeluaran Barang Lain';
    showFeedback(`Preview: ${reportLabel} (${lokasiStock} - ${filterLabel})`);
  };

  return (
    <div
      id="laporan-pengeluaran-barang-lain-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      {/* Unified Black Header Banner */}
      <FormHeaderBanner
        title="Laporan Pengeluaran Barang Lain"
        onClose={onClose}
        onExportExcel={() => showFeedback('Export Excel selesai')}
      />

      {/* Main Scrollable Container */}
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-[630px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-2.5 shadow-xs">
          {/* Header Box: LAPORAN PENGELUARAN BARANG LAIN */}
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[15px] tracking-wide text-black font-sans">
              LAPORAN PENGELUARAN BARANG LAIN
            </h1>
          </div>

          {/* Action Toolbar */}
          <div className="border-b border-[#999999] pb-2">
            <FormActionButtons
              compact
              onSimpan={() =>
                showFeedback('Parameter Laporan Pengeluaran Barang Lain tersimpan')
              }
              onBaru={handleBaru}
              onKoreksi={() => showFeedback('Silakan ubah filter laporan')}
              onHapus={handleHapus}
              feedback={feedback}
            />
          </div>

          {/* Group 1: Periode */}
          <fieldset className="border border-[#999999] px-2.5 py-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Periode
            </legend>
            <div className="flex items-center space-x-1.5 pt-0.5">
              <label className="font-bold text-black text-[11px] whitespace-nowrap pl-2 pr-1">
                Tanggal ( dd-mm-yyyy ) :
              </label>

              <div className="flex items-center w-[98px] h-[21px] bg-white border border-[#7A7A7A]">
                <input
                  type="text"
                  value={tglStart}
                  onChange={(e) => setTglStart(e.target.value)}
                  placeholder="__-__-____"
                  className="w-full px-1.5 text-[11px] outline-none font-mono bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tglStartPickerRef.current?.showPicker) {
                      tglStartPickerRef.current.showPicker();
                    } else {
                      tglStartPickerRef.current?.click();
                    }
                  }}
                  title="Pilih Tanggal Awal"
                  className="px-1 bg-[#D4D0C8] border-l border-[#7A7A7A] hover:bg-[#E5E1D8] text-[9px] h-full cursor-pointer"
                >
                  ▼
                </button>
                <input
                  ref={tglStartPickerRef}
                  type="date"
                  onChange={(e) =>
                    handleDatePickerChange(e.target.value, setTglStart)
                  }
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>

              <span className="w-[62px] h-[21px] flex items-center justify-center bg-[#BDF4BA] border border-[#7A7A7A] text-[11px] font-bold text-black">
                s / d
              </span>

              <div className="flex items-center w-[98px] h-[21px] bg-white border border-[#7A7A7A]">
                <input
                  type="text"
                  value={tglEnd}
                  onChange={(e) => setTglEnd(e.target.value)}
                  placeholder="__-__-____"
                  className="w-full px-1.5 text-[11px] outline-none font-mono bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tglEndPickerRef.current?.showPicker) {
                      tglEndPickerRef.current.showPicker();
                    } else {
                      tglEndPickerRef.current?.click();
                    }
                  }}
                  title="Pilih Tanggal Akhir"
                  className="px-1 bg-[#D4D0C8] border-l border-[#7A7A7A] hover:bg-[#E5E1D8] text-[9px] h-full cursor-pointer"
                >
                  ▼
                </button>
                <input
                  ref={tglEndPickerRef}
                  type="date"
                  onChange={(e) =>
                    handleDatePickerChange(e.target.value, setTglEnd)
                  }
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>
            </div>
          </fieldset>

          {/* Group 2: Pilihan Laporan Berdasarkan */}
          <fieldset className="border border-[#999999] px-2.5 py-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Pilihan Laporan Berdasarkan :
            </legend>

            <div className="space-y-1.5 pt-0.5">
              {/* Option 1: Merk Barang (Disabled) */}
              <label className="flex items-center space-x-2 text-[11px] text-[#808080] cursor-not-allowed">
                <input
                  type="radio"
                  name="pengeluaran_lain_filter"
                  disabled
                  checked={filterType === 'merk'}
                  onChange={() => setFilterType('merk')}
                  className="cursor-not-allowed"
                />
                <span>Merk Barang</span>
              </label>

              {/* Option 2: Batasan No.Bukti (Checked by default with range inputs and green s / d) */}
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[142px] shrink-0">
                  <input
                    type="radio"
                    name="pengeluaran_lain_filter"
                    checked={filterType === 'batasan_no_bukti'}
                    onChange={() => setFilterType('batasan_no_bukti')}
                    className="cursor-pointer"
                  />
                  <span>Batasan No.Bukti</span>
                </label>

                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={noBuktiStart}
                    onChange={(e) =>
                      setNoBuktiStart(e.target.value.toUpperCase())
                    }
                    disabled={filterType !== 'batasan_no_bukti'}
                    className="w-[125px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8]"
                  />
                  <span className="w-[62px] h-[21px] flex items-center justify-center bg-[#BDF4BA] border border-[#7A7A7A] text-[11px] font-bold text-black">
                    s / d
                  </span>
                  <input
                    type="text"
                    value={noBuktiEnd}
                    onChange={(e) =>
                      setNoBuktiEnd(e.target.value.toUpperCase())
                    }
                    disabled={filterType !== 'batasan_no_bukti'}
                    className="w-[125px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8]"
                  />
                </div>
              </div>

              {/* Option 3: Customer (Enabled) */}
              <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer">
                <input
                  type="radio"
                  name="pengeluaran_lain_filter"
                  checked={filterType === 'customer'}
                  onChange={() => setFilterType('customer')}
                  className="cursor-pointer"
                />
                <span>Customer</span>
              </label>

              {/* Option 4: ALL berdasarkan periode (Enabled) */}
              <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer">
                <input
                  type="radio"
                  name="pengeluaran_lain_filter"
                  checked={filterType === 'all_periode'}
                  onChange={() => setFilterType('all_periode')}
                  className="cursor-pointer"
                />
                <span>ALL berdasarkan periode</span>
              </label>
            </div>
          </fieldset>

          {/* Lower Section: Lokasi Stock & Bentuk Laporan (Left) and PREVIEW / CLOSE Buttons (Right) */}
          <div className="flex items-end justify-between gap-2.5 pt-0.5">
            {/* Left controls */}
            <div className="flex-1 space-y-1.5">
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
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer min-h-[21px]"
                  >
                    <option value=""></option>
                    <option value="01 - Laporan Pengeluaran Barang Lain">
                      01 - Laporan Pengeluaran Barang Lain
                    </option>
                    <option value="02 - Rekap Pengeluaran Barang Lain">
                      02 - Rekap Pengeluaran Barang Lain
                    </option>
                  </select>
                </div>
              </fieldset>
            </div>

            {/* Right Buttons: PREVIEW and CLOSE side by side */}
            <div className="flex items-stretch gap-1.5 h-[84px] shrink-0">
              <button
                type="button"
                onClick={handlePreview}
                className="w-[82px] h-full bg-[#FFE4C4] hover:bg-[#FFECD6] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white font-extrabold text-[11px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
              >
                <span>
                  <span className="underline">P</span>REVIEW
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-[82px] h-full bg-[#FFE4C4] hover:bg-[#FFECD6] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white font-extrabold text-[11px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center p-1"
              >
                <span className="border border-dotted border-black/60 w-full h-full flex items-center justify-center">
                  <span className="underline">C</span>LOSE
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
