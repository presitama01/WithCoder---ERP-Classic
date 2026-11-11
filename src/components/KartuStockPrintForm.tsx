import React, { useState, useRef } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

interface KartuStockPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KartuStockPrintForm: React.FC<KartuStockPrintFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [bulanStart, setBulanStart] = useState<string>('09-2026');
  const [bulanEnd, setBulanEnd] = useState<string>('09-2026');
  const [tglStart, setTglStart] = useState<string>('');
  const [tglEnd, setTglEnd] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('item_code');
  const [itemCode, setItemCode] = useState<string>('');
  const [itemName, setItemName] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('01 - OFFICE');
  const [bentukLaporan, setBentukLaporan] = useState<string>('01 - Kartu Stock');
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
    setBulanStart('09-2026');
    setBulanEnd('09-2026');
    setTglStart('');
    setTglEnd('');
    setFilterType('item_code');
    setItemCode('');
    setItemName('');
    setLokasiStock('01 - OFFICE');
    setBentukLaporan('01 - Kartu Stock');
    showFeedback('Filter baru direset');
  };

  const handleHapus = () => {
    setTglStart('');
    setTglEnd('');
    setItemCode('');
    setItemName('');
    showFeedback('Parameter dibersihkan');
  };

  const handlePreview = () => {
    const itemLabel = itemCode.trim() ? `Item ${itemCode.trim()}` : 'Semua Item';
    showFeedback(`Preview: ${bentukLaporan} (${lokasiStock} - ${itemLabel})`);
  };

  return (
    <div
      id="kartu-stock-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      {/* Unified Black Header Banner */}
      <FormHeaderBanner
        title="Kartu Stock"
        onClose={onClose}
        onExportExcel={() => showFeedback('Export Excel selesai')}
      />

      {/* Main Scrollable Container */}
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-[600px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-2.5 shadow-xs">
          {/* Header Box: KARTU STOCK */}
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[14px] tracking-wide text-black font-sans">
              KARTU STOCK
            </h1>
          </div>

          {/* Action Toolbar */}
          <div className="border-b border-[#999999] pb-2">
            <FormActionButtons
              compact
              onSimpan={() => showFeedback('Parameter Kartu Stock tersimpan')}
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
            <div className="grid grid-cols-[140px_105px_58px_105px] items-center gap-x-1.5 gap-y-1.5 pt-0.5">
              {/* Row 1: Bulan */}
              <label className="text-right font-bold text-black text-[11px] pr-1">
                Bulan :
              </label>
              <input
                type="text"
                value={bulanStart}
                onChange={(e) => setBulanStart(e.target.value)}
                className="w-full h-[21px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] font-mono outline-none"
              />
              <span className="h-[21px] flex items-center justify-center bg-[#BDF4BA] border border-[#7A7A7A] text-[11px] font-bold text-black">
                s / d
              </span>
              <input
                type="text"
                value={bulanEnd}
                onChange={(e) => setBulanEnd(e.target.value)}
                className="w-full h-[21px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] font-mono outline-none"
              />

              {/* Row 2: Tanggal ( dd-mm-yyyy ) */}
              <label className="text-right font-bold text-black text-[11px] pr-1 whitespace-nowrap">
                Tanggal ( dd-mm-yyyy ) :
              </label>
              <div className="flex items-center h-[21px] bg-white border border-[#7A7A7A]">
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
                  onChange={(e) => handleDatePickerChange(e.target.value, setTglStart)}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>

              <span className="h-[21px] flex items-center justify-center bg-[#BDF4BA] border border-[#7A7A7A] text-[11px] font-bold text-black">
                s / d
              </span>

              <div className="flex items-center h-[21px] bg-white border border-[#7A7A7A]">
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
                  onChange={(e) => handleDatePickerChange(e.target.value, setTglEnd)}
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
                  name="kartu_stock_filter"
                  disabled
                  checked={filterType === 'merk'}
                  onChange={() => setFilterType('merk')}
                  className="cursor-not-allowed"
                />
                <span>Merk Barang</span>
              </label>

              {/* Option 2: Batasan kode Barang (Disabled) */}
              <label className="flex items-center space-x-2 text-[11px] text-[#808080] cursor-not-allowed">
                <input
                  type="radio"
                  name="kartu_stock_filter"
                  disabled
                  checked={filterType === 'batasan_kode'}
                  onChange={() => setFilterType('batasan_kode')}
                  className="cursor-not-allowed"
                />
                <span>Batasan kode Barang</span>
              </label>

              {/* Option 3: Item Code (Enabled & Checked by default with white code + yellow description input) */}
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="kartu_stock_filter"
                    checked={filterType === 'item_code'}
                    onChange={() => setFilterType('item_code')}
                    className="cursor-pointer"
                  />
                  <span>Item Code</span>
                </label>

                <div className="flex items-center space-x-1 flex-1">
                  <input
                    type="text"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                    disabled={filterType !== 'item_code'}
                    className="w-[100px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8]"
                  />
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    disabled={filterType !== 'item_code'}
                    className="flex-1 h-[21px] bg-[#FFFFBF] border border-[#7A7A7A] px-2 text-[11px] outline-none shadow-inner"
                  />
                </div>
              </div>

              {/* Option 4: ALL berdasarkan periode (Disabled) */}
              <label className="flex items-center space-x-2 text-[11px] text-[#808080] cursor-not-allowed">
                <input
                  type="radio"
                  name="kartu_stock_filter"
                  disabled
                  checked={filterType === 'all_periode'}
                  onChange={() => setFilterType('all_periode')}
                  className="cursor-not-allowed"
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
                    <option value="01 - OFFICE">01 - OFFICE</option>
                    <option value="ALL">ALL</option>
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
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer"
                  >
                    <option value="01 - Kartu Stock">01 - Kartu Stock</option>
                    <option value="02 - Rekap Kartu Stock">02 - Rekap Kartu Stock</option>
                    <option value="03 - Mutasi Kartu Stock">03 - Mutasi Kartu Stock</option>
                  </select>
                </div>
              </fieldset>
            </div>

            {/* Right Buttons: PREVIEW and CLOSE side by side matching reference screenshot */}
            <div className="flex items-stretch gap-1.5 h-[84px] shrink-0">
              <button
                type="button"
                onClick={handlePreview}
                className="w-[82px] h-full bg-[#FFE4C4] hover:bg-[#FFECD6] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white font-extrabold text-[11px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
              >
                <span>PREVIEW</span>
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
