import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

interface ItemCostStockPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ItemCostStockPrintForm: React.FC<ItemCostStockPrintFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [tglStart, setTglStart] = useState<string>(':   -   -     ');
  const [tglEnd, setTglEnd] = useState<string>(':   -   -     ');
  const [filterType, setFilterType] = useState<string>('merk'); // 'merk', 'batasan_kode', 'customer', 'all'
  const [merkFilter, setMerkFilter] = useState<string>('');
  const [kodeBarangStart, setKodeBarangStart] = useState<string>('');
  const [kodeBarangEnd, setKodeBarangEnd] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>(
    '01 - Item Cost & Stock'
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleBaru = () => {
    setTglStart(':   -   -     ');
    setTglEnd(':   -   -     ');
    setFilterType('merk');
    setMerkFilter('');
    setKodeBarangStart('');
    setKodeBarangEnd('');
    setLokasiStock('ALL');
    setBentukLaporan('01 - Item Cost & Stock');
    showFeedback('Filter baru direset');
  };

  const handleHapus = () => {
    setMerkFilter('');
    setKodeBarangStart('');
    setKodeBarangEnd('');
    showFeedback('Parameter dibersihkan');
  };

  const handlePreview = () => {
    showFeedback(`Preview: ${bentukLaporan} (${lokasiStock})`);
  };

  return (
    <div
      id="item-cost-stock-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Item Cost & Stock"
        onClose={onClose}
        onExportExcel={() => showFeedback('Export Excel selesai')}
      />

      {/* Main Scrollable Container */}
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-[560px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-3 shadow-xs">
          {/* Header Box: ITEM COST _STOCK */}
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[13px] tracking-wide text-black font-sans">
              ITEM COST _STOCK
            </h1>
          </div>

          {/* Action Toolbar */}
          <div className="border-b border-[#999999] pb-2">
            <FormActionButtons
              compact
              onSimpan={() => showFeedback('Parameter Item Cost & Stock tersimpan')}
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

              {/* Pale green badge for s / d */}
              <span className="px-2 py-0.5 bg-[#E2F0D9] border border-[#7A7A7A] text-[11px] font-bold text-black text-center min-w-[38px]">
                s / d
              </span>

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
              {/* Option 1: Merk Barang (Checked by default in reference image) */}
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="item_cost_stock_filter"
                    checked={filterType === 'merk'}
                    onChange={() => setFilterType('merk')}
                    className="cursor-pointer"
                  />
                  <span>Merk Barang</span>
                </label>
              </div>

              {/* Option 2: Batasan kode Barang */}
              <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="item_cost_stock_filter"
                  checked={filterType === 'batasan_kode'}
                  onChange={() => setFilterType('batasan_kode')}
                  className="cursor-pointer"
                />
                <span>Batasan kode Barang</span>
              </label>

              {/* Option 3: Customer */}
              <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="item_cost_stock_filter"
                  checked={filterType === 'customer'}
                  onChange={() => setFilterType('customer')}
                  className="cursor-pointer"
                />
                <span>Customer</span>
              </label>

              {/* Option 4: ALL */}
              <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="item_cost_stock_filter"
                  checked={filterType === 'all'}
                  onChange={() => setFilterType('all')}
                  className="cursor-pointer"
                />
                <span>ALL</span>
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
                    <option value="01 - Item Cost & Stock">
                      01 - Item Cost & Stock
                    </option>
                    <option value="02 - Rekap Item Cost & Stock">
                      02 - Rekap Item Cost & Stock
                    </option>
                    <option value="03 - Mutasi Item Cost & Stock">
                      03 - Mutasi Item Cost & Stock
                    </option>
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
